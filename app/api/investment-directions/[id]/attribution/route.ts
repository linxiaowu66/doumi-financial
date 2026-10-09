import { NextResponse } from "next/server";
import { Decimal } from "@prisma/client/runtime/library";
import prisma from "@/lib/prisma";
import { getAuthenticatedUserId } from "@/lib/auth-scope";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const directionId = Number((await params).id);
  if (!Number.isInteger(directionId)) return NextResponse.json({ error: "参数错误" }, { status: 400 });

  const direction = await prisma.investmentDirection.findFirst({
    where: { id: directionId, userId },
    include: { funds: { include: { transactions: { orderBy: [{ date: "asc" }, { id: "asc" }] } } }, dailyProfits: { orderBy: { date: "asc" } } },
  });
  if (!direction) return NextResponse.json({ error: "投资方向不存在" }, { status: 404 });

  const funds = direction.funds.map((fund) => {
    let shares = new Decimal(0);
    let cost = new Decimal(0);
    let realized = new Decimal(0);
    let cashDividend = new Decimal(0);
    let reinvestDividend = new Decimal(0);
    let fees = new Decimal(0);
    for (const tx of fund.transactions) {
      const amount = new Decimal(tx.amount);
      const txShares = new Decimal(tx.shares);
      const price = new Decimal(tx.price);
      const fee = new Decimal(tx.fee);
      fees = fees.plus(fee);
      if (tx.type === "BUY") { shares = shares.plus(txShares); cost = cost.plus(amount); }
      if (tx.type === "SELL") {
        const sold = txShares.abs();
        const avg = shares.greaterThan(0) ? cost.dividedBy(shares) : new Decimal(0);
        const soldCost = avg.times(sold);
        shares = shares.minus(sold); cost = cost.minus(soldCost);
        realized = realized.plus(sold.times(price).minus(fee).minus(soldCost));
      }
      if (tx.type === "DIVIDEND" && tx.dividendReinvest) { shares = shares.plus(txShares); reinvestDividend = reinvestDividend.plus(amount); }
      if (tx.type === "DIVIDEND" && !tx.dividendReinvest) cashDividend = cashDividend.plus(amount);
    }
    if (shares.abs().lessThan(0.03)) { shares = new Decimal(0); cost = new Decimal(0); }
    const value = fund.latestNetWorth ? shares.times(new Decimal(fund.latestNetWorth)) : new Decimal(0);
    const holdingProfit = value.minus(cost);
    const totalProfit = holdingProfit.plus(realized).plus(cashDividend).plus(reinvestDividend);
    return { fundId: fund.id, fundName: fund.name, category: fund.category || "未分类", actualCategory: fund.actualCategory, metadataAsOf: fund.metadataAsOf, marketValue: value.toNumber(), weight: 0, holdingProfit: holdingProfit.toNumber(), realizedProfit: realized.toNumber(), dividends: cashDividend.plus(reinvestDividend).toNumber(), fees: fees.toNumber(), totalProfit: totalProfit.toNumber() };
  });
  const totalValue = funds.reduce((sum, fund) => sum + fund.marketValue, 0);
  const totalProfit = funds.reduce((sum, fund) => sum + fund.totalProfit, 0);
  const daily = direction.dailyProfits.map((row) => ({ date: row.date.toISOString().slice(0, 10), value: Number(row.currentValue), invested: Number(row.totalInvested) }));
  let peak = 0;
  let maxDrawdown = 0;
  let recoveryDays = 0;
  let lastPeakDate: string | null = null;
  let recoveryStart: string | null = null;
  const returns: number[] = [];
  let riskIndex = 1;
  const indexedDaily = daily.map((row, index) => {
    if (index === 0 || daily[index - 1].value <= 0) return { ...row, riskValue: riskIndex };
    const cashFlow = row.invested - daily[index - 1].invested;
    const periodReturn = (row.value - daily[index - 1].value - cashFlow) / daily[index - 1].value;
    riskIndex *= 1 + periodReturn;
    returns.push(periodReturn);
    return { ...row, riskValue: riskIndex };
  });
  let downsideDays = 0;
  for (let index = 0; index < indexedDaily.length; index++) {
    const row = indexedDaily[index];
    if (index > 0 && returns[index - 1] < 0) downsideDays++;
    if (row.riskValue >= peak) {
      peak = row.riskValue;
      lastPeakDate = row.date;
      if (recoveryStart && lastPeakDate) {
        recoveryDays = Math.max(recoveryDays, Math.round((new Date(lastPeakDate).getTime() - new Date(recoveryStart).getTime()) / 86400000));
        recoveryStart = null;
      }
    } else if (peak > 0) {
      maxDrawdown = Math.min(maxDrawdown, (row.riskValue - peak) / peak * 100);
      if (!recoveryStart) recoveryStart = lastPeakDate;
    }
  }
  const averageReturn = returns.length ? returns.reduce((sum, value) => sum + value, 0) / returns.length : 0;
  const variance = returns.length > 1 ? returns.reduce((sum, value) => sum + (value - averageReturn) ** 2, 0) / (returns.length - 1) : 0;
  const volatility = Math.sqrt(variance) * Math.sqrt(252) * 100;
  const sharpe = volatility > 0 ? (averageReturn * 252) / (volatility / 100) : null;
  const weightedFunds = funds.map((fund) => ({ ...fund, weight: totalValue > 0 ? Number((fund.marketValue / totalValue * 100).toFixed(2)) : 0 }));
  const concentration = weightedFunds.reduce((sum, fund) => sum + (fund.weight / 100) ** 2, 0) * 100;
  return NextResponse.json({
    directionId, directionName: direction.name, totalValue, totalProfit,
    maxDrawdown: Number(maxDrawdown.toFixed(2)), volatility: Number(volatility.toFixed(2)),
    sharpe: sharpe === null ? null : Number(sharpe.toFixed(2)), recoveryDays, downsideDays,
    dataCoverageDays: daily.length, concentration: Number(concentration.toFixed(2)),
    funds: weightedFunds,
  });
}
