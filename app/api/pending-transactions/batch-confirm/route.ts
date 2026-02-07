import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { calculateConfirmDate, getNextWorkday, isWorkday } from '@/lib/workday';
import { format } from 'date-fns';

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
      // T+N -> 确认日期
      const confirmDate = await calculateConfirmDate(effectiveApplyDate, pt.fund.confirmDays);
      const confirmDateStr = format(confirmDate, 'yyyy-MM-dd');

      // 4. 检查该基金在确认日期是否有净值
      // 注意：目前 Fund 模型只存储了 latestNetWorth 和 netWorthDate。
      // 如果 netWorthDate 不等于 confirmDateStr，说明该基金还没有更新到确认日期的净值。
      // *未来改进：如果有 FundPriceHistory 表，应该去查历史净值表*
      
      if (pt.fund.netWorthDate !== confirmDateStr || !pt.fund.latestNetWorth) {
        logs.push(`跳过交易 #${pt.id}: 基金 ${pt.fund.name} 尚未更新 ${confirmDateStr} 的净值 (当前: ${pt.fund.netWorthDate})`);
        continue;
      }

      const netWorth = Number(pt.fund.latestNetWorth);
      let transactionData: any = {
        fundId: pt.fundId,
        date: confirmDate,
        price: netWorth,
        remark: `自动转正 (申请日: ${format(pt.applyDate, 'yyyy-MM-dd')}${effectiveApplyDate.getTime() !== pt.applyDate.getTime() ? ' 顺延' : ''})`,
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
