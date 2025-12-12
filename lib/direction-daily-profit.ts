import prisma from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';
import dayjs from 'dayjs';

/**
 * 计算投资方向在指定日期的盈亏数据
 */
export type NetWorthMap = Record<
  number,
  Record<string, number | undefined> | undefined
>;

// 获取基金历史净值（最近days天），返回日期->净值映射
export async function fetchFundHistoryNetWorth(
  code: string,
  days: number
): Promise<Record<string, number>> {
  try {
    // 东方财富移动端历史净值接口
    const url = `https://fundmobapi.eastmoney.com/FundMNewApi/FundMNHisNetList?FCODE=${code}&pageIndex=1&pageSize=${days}&plat=Android&appType=ttjj&product=EFund&Version=1&deviceid=123`;
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
      },
      cache: 'no-store',
    });
    const data = await res.json();
    const map: Record<string, number> = {};
    if (data?.Datas && Array.isArray(data.Datas)) {
      data.Datas.forEach((item: any) => {
        const dateRaw = item.FSRQ || item.NAVDATE;
        const navValue = item.NAV || item.DWJZ; // DWJZ 为单位净值
        if (navValue && dateRaw) {
          const dateStr = dayjs(dateRaw).format('YYYY-MM-DD');
          map[dateStr] = parseFloat(navValue);
        }
      });
    }
    return map;
  } catch (error) {
    console.error(`获取基金 ${code} 历史净值失败:`, error);
    return {};
  }
}

export async function calculateDirectionDailyProfit(
  directionId: number,
  targetDate: Date,
  netWorthMap?: NetWorthMap
): Promise<{
  dailyProfit: Decimal;
  cumulativeProfit: Decimal;
  cumulativeProfitRate: Decimal;
  totalInvested: Decimal;
  currentValue: Decimal;
}> {
  // 获取投资方向信息
  const direction = await prisma.investmentDirection.findUnique({
    where: { id: directionId },
    include: {
      funds: {
        include: {
          transactions: {
            where: {
              date: {
                lte: dayjs(targetDate).endOf('day').toDate(),
              },
            },
            orderBy: { date: 'asc' },
          },
        },
      },
    },
  });

  if (!direction) {
    throw new Error(`投资方向 ${directionId} 不存在`);
  }

  // 初始化统计数据
  let totalInvested = new Decimal(0); // 总投入
  let totalCurrentValue = new Decimal(0); // 当前总市值
  let totalCost = new Decimal(0); // 持仓总成本
  let totalSellProfit = new Decimal(0); // 累计卖出收益
  let totalDividendCash = new Decimal(0); // 累计现金分红
  let totalDividendReinvest = new Decimal(0); // 累计分红再投资

  // 遍历每只基金计算统计
  for (const fund of direction.funds) {
    let fundShares = new Decimal(0);
    let fundCost = new Decimal(0);
    let fundSellProfit = new Decimal(0);
    let fundDividendCash = new Decimal(0);
    let fundDividendReinvest = new Decimal(0);

    for (const tx of fund.transactions) {
      const amount = new Decimal(tx.amount.toString());
      const shares = new Decimal(tx.shares.toString());
      const price = new Decimal(tx.price.toString());
      const fee = new Decimal(tx.fee.toString());

      if (tx.type === 'BUY') {
        // 买入：增加份额和成本
        fundShares = fundShares.plus(shares);
        fundCost = fundCost.plus(amount);
        totalInvested = totalInvested.plus(amount);
      } else if (tx.type === 'SELL') {
        // 卖出：减少份额和成本
        const sellShares = shares.abs();
        const avgCostPrice = fundShares.isZero()
          ? new Decimal(0)
          : fundCost.dividedBy(fundShares);
        const costOfSold = avgCostPrice.times(sellShares);

        fundShares = fundShares.minus(sellShares);
        fundCost = fundCost.minus(costOfSold);

        // 卖出收益 = 卖出金额 - 成本 - 手续费
        const sellRevenue = sellShares.times(price).minus(fee);
        const sellProfit = sellRevenue.minus(costOfSold);
        fundSellProfit = fundSellProfit.plus(sellProfit);
      } else if (tx.type === 'DIVIDEND') {
        // 分红
        if (tx.dividendReinvest) {
          // 分红再投资：增加份额，但不增加成本
          fundShares = fundShares.plus(shares);
          fundDividendReinvest = fundDividendReinvest.plus(amount);
        } else {
          // 现金分红：不影响份额和成本
          fundDividendCash = fundDividendCash.plus(amount);
        }
      }
    }

    // 累加到总统计
    totalCost = totalCost.plus(fundCost);
    totalSellProfit = totalSellProfit.plus(fundSellProfit);
    totalDividendCash = totalDividendCash.plus(fundDividendCash);
    totalDividendReinvest = totalDividendReinvest.plus(fundDividendReinvest);

    // 计算当前市值（使用最新净值）
    // 取当前日期的净值：历史净值优先，其次最新净值。
    // 如果当日没有净值，使用最近的历史净值（向前找）。
    const dateStr = dayjs(targetDate).format('YYYY-MM-DD');
    let historyNet =
      netWorthMap?.[fund.id]?.[dateStr] ??
      (fund.latestNetWorth ? parseFloat(fund.latestNetWorth.toString()) : null);

    if (historyNet === undefined || historyNet === null) {
      const historyForFund = netWorthMap?.[fund.id];
      if (historyForFund) {
        const availableDates = Object.keys(historyForFund).sort();
        // 找到小于等于当前日期的最近净值
        for (let i = availableDates.length - 1; i >= 0; i--) {
          if (availableDates[i] <= dateStr) {
            historyNet = historyForFund[availableDates[i]];
            break;
          }
        }
      }
    }

    if (historyNet !== null && historyNet !== undefined) {
      const currentPrice = new Decimal(historyNet.toString());
      const fundValue = fundShares.times(currentPrice);
      totalCurrentValue = totalCurrentValue.plus(fundValue);
    }
  }

  // 计算收益指标
  const holdingProfit = totalCurrentValue.minus(totalCost); // 持仓收益
  const totalProfit = holdingProfit
    .plus(totalSellProfit)
    .plus(totalDividendCash)
    .plus(totalDividendReinvest); // 累计总收益

  const totalProfitRate = totalInvested.isZero()
    ? new Decimal(0)
    : totalProfit.dividedBy(totalInvested).times(100); // 累计收益率

  // 计算每日盈亏（相对于前一天）
  const previousDay = dayjs(targetDate).subtract(1, 'day');
  const previousRecord = await prisma.directionDailyProfit.findFirst({
    where: {
      directionId,
      date: {
        gte: previousDay.startOf('day').toDate(),
        lte: previousDay.endOf('day').toDate(),
      },
    },
    orderBy: { date: 'desc' },
  });

  const previousCumulativeProfit = previousRecord
    ? new Decimal(previousRecord.cumulativeProfit.toString())
    : new Decimal(0);

  const dailyProfit = totalProfit.minus(previousCumulativeProfit);

  return {
    dailyProfit,
    cumulativeProfit: totalProfit,
    cumulativeProfitRate: totalProfitRate,
    totalInvested,
    currentValue: totalCurrentValue,
  };
}

/**
 * 计算并保存投资方向在指定日期的盈亏数据
 */
export async function saveDirectionDailyProfit(
  directionId: number,
  targetDate: Date,
  netWorthMap?: NetWorthMap
): Promise<void> {
  const dateOnly = dayjs(targetDate).startOf('day').toDate();

  const {
    dailyProfit,
    cumulativeProfit,
    cumulativeProfitRate,
    totalInvested,
    currentValue,
  } = await calculateDirectionDailyProfit(directionId, targetDate, netWorthMap);

  // 使用 upsert 确保每天只有一条记录
  await prisma.directionDailyProfit.upsert({
    where: {
      directionId_date: {
        directionId,
        date: dateOnly,
      },
    },
    update: {
      dailyProfit,
      cumulativeProfit,
      cumulativeProfitRate,
      totalInvested,
      currentValue,
    },
    create: {
      directionId,
      date: dateOnly,
      dailyProfit,
      cumulativeProfit,
      cumulativeProfitRate,
      totalInvested,
      currentValue,
    },
  });
}

/**
 * 为所有投资方向计算并保存指定日期的盈亏数据
 */
export async function saveAllDirectionsDailyProfit(
  targetDate: Date = new Date()
): Promise<{ success: number; failed: number; errors: string[] }> {
  const directions = await prisma.investmentDirection.findMany({
    select: { id: true },
  });

  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const direction of directions) {
    try {
      await saveDirectionDailyProfit(direction.id, targetDate);
      success++;
    } catch (error) {
      failed++;
      const errorMsg = `投资方向 ${direction.id}: ${
        error instanceof Error ? error.message : '未知错误'
      }`;
      errors.push(errorMsg);
      console.error(errorMsg, error);
    }
  }

  return { success, failed, errors };
}

// 为指定投资方向回填最近days天的每日盈亏（使用历史净值，不持久化快照）
export async function saveDirectionDailyProfitRange(
  directionId: number,
  days: number
): Promise<{ success: number; failed: number; errors: string[] }> {
  // 获取该方向的基金列表
  const funds = await prisma.fund.findMany({
    where: { directionId },
    select: { id: true, code: true, latestNetWorth: true },
  });

  // 拉取各基金的历史净值
  const netWorthMap: NetWorthMap = {};
  await Promise.all(
    funds.map(async (fund) => {
      if (!fund.code) return;
      netWorthMap[fund.id] = await fetchFundHistoryNetWorth(fund.code, days);
      // 确保今天也有一个净值（如果历史未包含，则用latestNetWorth兜底）
      const todayStr = dayjs().format('YYYY-MM-DD');
      if (
        fund.latestNetWorth &&
        netWorthMap[fund.id] &&
        netWorthMap[fund.id]![todayStr] === undefined
      ) {
        netWorthMap[fund.id]![todayStr] = parseFloat(
          fund.latestNetWorth.toString()
        );
      }
    })
  );

  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const targetDate = dayjs().subtract(i, 'day').toDate();
    try {
      await saveDirectionDailyProfit(directionId, targetDate, netWorthMap);
      success++;
    } catch (error) {
      failed++;
      errors.push(
        `${dayjs(targetDate).format('YYYY-MM-DD')}: ${
          error instanceof Error ? error.message : '未知错误'
        }`
      );
    }
  }

  return { success, failed, errors };
}
