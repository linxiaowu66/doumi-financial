import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { calculateConfirmDate, getNextWorkday, isWorkday } from '@/lib/workday';
import { format } from 'date-fns';
import { getFundNetWorth } from '@/lib/fund-price';

export async function POST(request: Request) {
  const logs: string[] = [];

  try {
    // 1. 获取所有状态为 WAITING 的待确认交易
    const pendingTransactions = await prisma.pendingTransaction.findMany({
      where: { status: 'WAITING' },
      include: { fund: true },
    });

    logs.push(`找到 ${pendingTransactions.length} 条待确认交易`);

    for (const pt of pendingTransactions) {
      const applyDate = new Date(pt.applyDate);
      const utcHours = applyDate.getUTCHours();
      const isTodayWork = await isWorkday(applyDate);
      
      let effectiveApplyDate = applyDate;
      
      // 判断逻辑：如果今天不是工作日，或者时间超过15:00 (UTC 7点)
      if (!isTodayWork || utcHours >= 7) {
        effectiveApplyDate = await getNextWorkday(applyDate);
        const reason = !isTodayWork ? '非交易日' : '超过15:00';
        logs.push(`交易 #${pt.id} (${reason})，申请日顺延至 ${format(effectiveApplyDate, 'yyyy-MM-dd')}`);
      }

      // 3. 计算确认日期 (基于有效申请日)
      // T+N -> 确认日期 (预计份额确认/到账日期)
      const confirmDate = await calculateConfirmDate(effectiveApplyDate, pt.fund.confirmDays);
      const confirmDateStr = format(confirmDate, 'yyyy-MM-dd');

      // 4. 检查该基金在有效申请日(T日)是否有净值
      const requiredNetWorthDate = effectiveApplyDate;
      const requiredNetWorthDateStr = format(requiredNetWorthDate, 'yyyy-MM-dd');

      let netWorth: number | null = null;
      let netWorthDate: Date = requiredNetWorthDate;

      // 首先检查数据库中当前保存的净值是否匹配
      if (pt.fund.netWorthDate === requiredNetWorthDateStr && pt.fund.latestNetWorth) {
        netWorth = Number(pt.fund.latestNetWorth);
      } else {
        // 如果不匹配，尝试从接口获取历史净值
        logs.push(`基金 ${pt.fund.name} 当前净值日期 (${pt.fund.netWorthDate}) 不匹配申请日 (${requiredNetWorthDateStr})，尝试从接口获取...`);
        
        try {
          const result = await getFundNetWorth(pt.fund.code, requiredNetWorthDate);
          if (result) {
            netWorth = result.netWorth;
            // 如果获取到的日期不是精确匹配的日期，需要注意
            if (result.matchType !== 'exact') {
               logs.push(`注意: 基金 ${pt.fund.name} 未找到 ${requiredNetWorthDateStr} 的精确净值，使用了 ${result.date} 的净值`);
               // 如果是最近交易日逻辑，可能意味着这天是非交易日，或者数据还没更新。
               // 按照之前的逻辑，我们应该尽量使用精确日期的净值。
               // 如果 matchType 是 nearest，且日期差很大，可能不对。
               // 这里 getFundNetWorth 已经处理了非交易日向前找的情况。
               // 对于申请日，如果是工作日但没有净值，可能是还没出。
               
               // 如果返回的日期比 effectiveApplyDate 还早，那可能是还没更新到这一天
               const resultDate = new Date(result.date);
               if (resultDate.getTime() < requiredNetWorthDate.getTime()) {
                 logs.push(`跳过交易 #${pt.id}: 接口返回的净值日期 (${result.date}) 早于申请日 (${requiredNetWorthDateStr})，说明尚未更新`);
                 netWorth = null;
               } else {
                 // 如果日期一致（或者逻辑允许的情况），使用该净值
                 netWorthDate = new Date(result.date);
               }
            } else {
               logs.push(`已获取 ${pt.fund.name} 在 ${result.date} 的净值: ${result.netWorth}`);
            }
          }
        } catch (e) {
          console.error(`获取基金 ${pt.fund.code} 净值失败`, e);
        }
      }

      if (netWorth === null) {
        logs.push(`跳过交易 #${pt.id}: 无法获取基金 ${pt.fund.name} 在 ${requiredNetWorthDateStr} 的净值`);
        continue;
      }

      let transactionData: any = {
        fundId: pt.fundId,
        date: netWorthDate, // 使用实际获取到净值的日期
        price: netWorth,
        remark: `自动转正 (申请日: ${format(pt.applyDate, 'yyyy-MM-dd')}${effectiveApplyDate.getTime() !== pt.applyDate.getTime() ? ' 顺延' : ''}, 确认日: ${confirmDateStr})`,
        dividendReinvest: false,
      };

      if (pt.type === 'BUY') {
        // 买入逻辑
        if (!pt.applyAmount) {
          logs.push(`错误交易 #${pt.id}: 买入缺少金额`);
          continue;
        }
        
        const applyAmount = Number(pt.applyAmount);
        const feeRate = Number(pt.fund.defaultBuyFee) / 100; // 0.15% -> 0.0015
        
        // 净申购金额 = 申请金额 / (1 + 费率)
        const netAmount = applyAmount / (1 + feeRate);
        // 手续费 = 申请金额 - 净申购金额
        const fee = applyAmount - netAmount;
        // 确认份额 = 净申购金额 / 净值
        const shares = netAmount / netWorth;

        transactionData = {
          ...transactionData,
          type: 'BUY',
          amount: applyAmount, // 记录实际花费金额
          shares: shares,
          fee: fee,
        };

      } else if (pt.type === 'SELL') {
        // 卖出逻辑
        if (!pt.applyShares) {
           logs.push(`错误交易 #${pt.id}: 卖出缺少份额`);
           continue;
        }

        const applyShares = Number(pt.applyShares);
        const feeRate = Number(pt.fund.defaultSellFee) / 100; // 0.5% -> 0.005

        // 赎回总额 = 份额 * 净值
        const grossAmount = applyShares * netWorth;
        // 手续费 = 赎回总额 * 费率
        const fee = grossAmount * feeRate;
        // 到手金额 = 赎回总额 - 手续费
        const netAmount = grossAmount - fee;

        transactionData = {
          ...transactionData,
          type: 'SELL',
          amount: netAmount, // 记录实际到手金额
          shares: applyShares,
          fee: fee,
        };
      }

      // 4. 执行事务：创建正式交易 + 更新待确认状态
      await prisma.$transaction([
        prisma.transaction.create({ data: transactionData }),
        prisma.pendingTransaction.update({
          where: { id: pt.id },
          data: { status: 'CONFIRMED' },
        }),
      ]);

      logs.push(`成功转正交易 #${pt.id}: ${pt.type} ${pt.fund.name} (确认日: ${confirmDateStr})`);
    }

    return NextResponse.json({ success: true, logs });

  } catch (error) {
    console.error('批量确认失败:', error);
    return NextResponse.json({ error: '批量确认失败', details: String(error) }, { status: 500 });
  }
}
