import prisma from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";
import dayjs from "dayjs";

/**
 * 计算单只基金在某一天的盈亏快照
 * 需要传入截至当天的所有交易记录和当天的净值
 */
export function calcFundSnapshot(
  transactions: Array<{
    type: string;
    amount: Decimal;
    shares: Decimal;
    price: Decimal;
    fee: Decimal;
    dividendReinvest: boolean;
  }>,
  netWorth: number | null,
): {
  holdingShares: Decimal;
  holdingCost: Decimal;
  holdingValue: Decimal;
  totalInvested: Decimal;
  cumulativeProfit: Decimal;
} {
  let holdingShares = new Decimal(0);
  let holdingCost = new Decimal(0);
  let totalInvested = new Decimal(0);
  let sellProfit = new Decimal(0);
  let dividendCash = new Decimal(0);
  let dividendReinvest = new Decimal(0);

  for (const tx of transactions) {
    const amount = new Decimal(tx.amount.toString());
    const shares = new Decimal(tx.shares.toString());
    const price = new Decimal(tx.price.toString());
    const fee = new Decimal(tx.fee.toString());

    if (tx.type === "BUY") {
      holdingShares = holdingShares.plus(shares);
      holdingCost = holdingCost.plus(amount);
      totalInvested = totalInvested.plus(amount);
    } else if (tx.type === "SELL") {
      const sellShares = shares.abs();
      const avgCost = holdingShares.isZero()
        ? new Decimal(0)
        : holdingCost.dividedBy(holdingShares);
      const costOfSold = avgCost.times(sellShares);

      holdingShares = holdingShares.minus(sellShares);
      holdingCost = holdingCost.minus(costOfSold);

      const sellRevenue = sellShares.times(price).minus(fee);
      sellProfit = sellProfit.plus(sellRevenue.minus(costOfSold));
    } else if (tx.type === "DIVIDEND") {
      if (tx.dividendReinvest) {
        holdingShares = holdingShares.plus(shares);
        dividendReinvest = dividendReinvest.plus(amount);
      } else {
        dividendCash = dividendCash.plus(amount);
      }
    }
  }

  // 防止浮点负零
  if (holdingShares.abs().lessThan("0.001")) holdingShares = new Decimal(0);
  if (holdingCost.abs().lessThan("0.01")) holdingCost = new Decimal(0);

  const holdingValue =
    netWorth !== null && holdingShares.greaterThan(0)
      ? holdingShares.times(new Decimal(netWorth.toString()))
      : new Decimal(0);

  const holdingProfit = holdingValue.minus(holdingCost);
  const cumulativeProfit = holdingProfit
    .plus(sellProfit)
    .plus(dividendCash)
    .plus(dividendReinvest);

  return { holdingShares, holdingCost, holdingValue, totalInvested, cumulativeProfit };
}

/**
 * 回填单只基金的全部历史盈亏记录
 * 以 FundNetWorthHistory 中已有的日期为驱动，逐日计算并 upsert
 */
export async function backfillFundDailyProfit(
  fundId: number,
): Promise<{ success: number; skipped: number; errors: string[] }> {
  const [fund, netWorthHistory, allTransactions] = await Promise.all([
    prisma.fund.findUnique({ where: { id: fundId }, select: { id: true } }),
    prisma.fundNetWorthHistory.findMany({
      where: { fundId },
      orderBy: { date: "asc" },
      select: { date: true, netWorth: true },
    }),
    prisma.transaction.findMany({
      where: { fundId },
      orderBy: { date: "asc" },
    }),
  ]);

  if (!fund) return { success: 0, skipped: 0, errors: [`基金 ${fundId} 不存在`] };
  if (!netWorthHistory.length) return { success: 0, skipped: 0, errors: [] };

  let success = 0;
  let skipped = 0;
  const errors: string[] = [];

  // 运行时跟踪历史最高/最低，用于标记创新高/创新低
  // 全量重算，从头跟踪历史最高/最低
  let maxProfit: Decimal | null = null;
  let minProfit: Decimal | null = null;

  for (const nw of netWorthHistory) {
    const dateStr = nw.date; // YYYY-MM-DD
    const netWorth = parseFloat(nw.netWorth.toString());

    // 取截至当天（含当天）的所有交易
    const txsUpToDate = allTransactions.filter(
      (tx) => dayjs(tx.date).format("YYYY-MM-DD") <= dateStr,
    );

    if (txsUpToDate.length === 0) {
      skipped++;
      continue;
    }

    try {
      const snap = calcFundSnapshot(txsUpToDate, netWorth);

      // 计算每日盈亏（与前一天对比）
      const prevRecord = await prisma.fundDailyProfit.findFirst({
        where: { fundId, date: { lt: dateStr } },
        orderBy: { date: "desc" },
        select: { cumulativeProfit: true },
      });
      const prevProfit = prevRecord
        ? new Decimal(prevRecord.cumulativeProfit.toString())
        : new Decimal(0);
      const dailyProfit = snap.cumulativeProfit.minus(prevProfit);

      const cumulativeProfitRate = snap.totalInvested.isZero()
        ? new Decimal(0)
        : snap.cumulativeProfit.dividedBy(snap.totalInvested).times(100);

      // 判断创新高/创新低
      const isNewHigh =
        maxProfit === null
          ? snap.cumulativeProfit.greaterThan(0)
          : snap.cumulativeProfit.greaterThan(maxProfit);
      const isNewLow =
        minProfit === null
          ? snap.cumulativeProfit.lessThan(0)
          : snap.cumulativeProfit.lessThan(minProfit);

      if (maxProfit === null || snap.cumulativeProfit.greaterThan(maxProfit))
        maxProfit = snap.cumulativeProfit;
      if (minProfit === null || snap.cumulativeProfit.lessThan(minProfit))
        minProfit = snap.cumulativeProfit;

      await prisma.fundDailyProfit.upsert({
        where: { fundId_date: { fundId, date: dateStr } },
        create: {
          fundId,
          date: dateStr,
          holdingShares: snap.holdingShares,
          holdingCost: snap.holdingCost,
          holdingValue: snap.holdingValue,
          dailyProfit,
          cumulativeProfit: snap.cumulativeProfit,
          cumulativeProfitRate,
          totalInvested: snap.totalInvested,
          isNewHigh,
          isNewLow,
        },
        update: {
          holdingShares: snap.holdingShares,
          holdingCost: snap.holdingCost,
          holdingValue: snap.holdingValue,
          dailyProfit,
          cumulativeProfit: snap.cumulativeProfit,
          cumulativeProfitRate,
          totalInvested: snap.totalInvested,
          isNewHigh,
          isNewLow,
        },
      });
      success++;
    } catch (err) {
      errors.push(
        `${dateStr}: ${err instanceof Error ? err.message : "未知错误"}`,
      );
    }
  }

  return { success, skipped, errors };
}

/**
 * 仅更新单只基金今天的盈亏记录（供定时任务调用）
 */
export async function saveFundDailyProfitToday(fundId: number): Promise<void> {
  const today = dayjs().format("YYYY-MM-DD");

  const [fund, nwRecord, allTransactions] = await Promise.all([
    prisma.fund.findUnique({
      where: { id: fundId },
      select: { latestNetWorth: true, netWorthDate: true },
    }),
    prisma.fundNetWorthHistory.findFirst({
      where: { fundId, date: today },
      select: { netWorth: true },
    }),
    prisma.transaction.findMany({
      where: { fundId, date: { lte: dayjs().endOf("day").toDate() } },
      orderBy: { date: "asc" },
    }),
  ]);

  if (!allTransactions.length) return;

  // 优先用今天的净值历史，否则用 fund.latestNetWorth
  const netWorth =
    nwRecord
      ? parseFloat(nwRecord.netWorth.toString())
      : fund?.latestNetWorth
        ? parseFloat(fund.latestNetWorth.toString())
        : null;

  if (netWorth === null) return;

  const snap = calcFundSnapshot(allTransactions, netWorth);

  const prevRecord = await prisma.fundDailyProfit.findFirst({
    where: { fundId, date: { lt: today } },
    orderBy: { date: "desc" },
    select: { cumulativeProfit: true },
  });
  const prevProfit = prevRecord
    ? new Decimal(prevRecord.cumulativeProfit.toString())
    : new Decimal(0);
  const dailyProfit = snap.cumulativeProfit.minus(prevProfit);

  const cumulativeProfitRate = snap.totalInvested.isZero()
    ? new Decimal(0)
    : snap.cumulativeProfit.dividedBy(snap.totalInvested).times(100);

  // 查历史最高/最低（不含今天）
  const [maxRecord, minRecord] = await Promise.all([
    prisma.fundDailyProfit.findFirst({
      where: { fundId, date: { lt: today } },
      orderBy: { cumulativeProfit: "desc" },
      select: { cumulativeProfit: true },
    }),
    prisma.fundDailyProfit.findFirst({
      where: { fundId, date: { lt: today } },
      orderBy: { cumulativeProfit: "asc" },
      select: { cumulativeProfit: true },
    }),
  ]);

  const prevMax = maxRecord ? new Decimal(maxRecord.cumulativeProfit.toString()) : null;
  const prevMin = minRecord ? new Decimal(minRecord.cumulativeProfit.toString()) : null;

  const isNewHigh = prevMax === null
    ? snap.cumulativeProfit.greaterThan(0)
    : snap.cumulativeProfit.greaterThan(prevMax);
  const isNewLow = prevMin === null
    ? snap.cumulativeProfit.lessThan(0)
    : snap.cumulativeProfit.lessThan(prevMin);

  await prisma.fundDailyProfit.upsert({
    where: { fundId_date: { fundId, date: today } },
    create: {
      fundId,
      date: today,
      holdingShares: snap.holdingShares,
      holdingCost: snap.holdingCost,
      holdingValue: snap.holdingValue,
      dailyProfit,
      cumulativeProfit: snap.cumulativeProfit,
      cumulativeProfitRate,
      totalInvested: snap.totalInvested,
      isNewHigh,
      isNewLow,
    },
    update: {
      holdingShares: snap.holdingShares,
      holdingCost: snap.holdingCost,
      holdingValue: snap.holdingValue,
      dailyProfit,
      cumulativeProfit: snap.cumulativeProfit,
      cumulativeProfitRate,
      totalInvested: snap.totalInvested,
      isNewHigh,
      isNewLow,
    },
  });
}
