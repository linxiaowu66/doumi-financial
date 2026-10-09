import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { calcFundSnapshot } from "@/lib/fund-daily-profit";
import { getAuthenticatedUserId } from "@/lib/auth-scope";

const pct = (value: number) => Number(value.toFixed(2));

export async function GET() {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return NextResponse.json({ error: "未登录" }, { status: 401 });

    const directions = await prisma.investmentDirection.findMany({
      where: { userId },
      include: {
        funds: {
          include: {
            transactions: { orderBy: [{ date: "asc" }, { id: "asc" }] },
            netWorthHistory: { orderBy: { date: "asc" }, select: { date: true, netWorth: true } },
          },
        },
        categoryTargets: true,
      },
    });

    const signals = directions.flatMap((direction) => {
      const values = direction.funds.map((fund) => {
        const history = fund.netWorthHistory.map((row) => Number(row.netWorth));
        const latest = history.at(-1) ?? Number(fund.latestNetWorth ?? 0);
        const ma20 = history.length ? history.slice(-20).reduce((sum, value) => sum + value, 0) / Math.min(20, history.length) : latest;
        const prior5 = history.at(-6) ?? latest;
        const return5 = prior5 ? ((latest / prior5) - 1) * 100 : 0;
        const snapshot = calcFundSnapshot(fund.transactions, latest || null);
        return { fund, latest, ma20, return5, marketValue: Number(snapshot.holdingValue), holdingCost: Number(snapshot.holdingCost) };
      });
      const totalValue = values.reduce((sum, item) => sum + item.marketValue, 0);
      const expectedAmount = Number(direction.expectedAmount ?? 0);
      return values.map(({ fund, latest, ma20, return5, marketValue, holdingCost }) => {
        const marketWeight = totalValue ? (marketValue / totalValue) * 100 : 0;
        const investedPercent = expectedAmount > 0 ? (holdingCost / expectedAmount) * 100 : 0;
        const target = direction.categoryTargets.find((item) => item.categoryName === fund.category);
        const targetPercent = target ? Number(target.targetPercent) : null;
        const belowTrend = latest < ma20 && return5 < 0;
        const aboveTrend = latest > ma20 && return5 > 0;
        const signal = belowTrend && marketValue > 1 ? "观察/暂缓加仓" : aboveTrend && (targetPercent === null || investedPercent < targetPercent) ? "分批买入观察" : "持有";
        return {
          fundId: fund.id, fundCode: fund.code, fundName: fund.name, directionId: direction.id, directionName: direction.name,
          signal, trend: belowTrend ? "弱于20日均线" : aboveTrend ? "强于20日均线" : "趋势不明确",
          latestNetWorth: latest || null, return5: pct(return5), marketValue: pct(marketValue), holdingCost: pct(holdingCost), weight: pct(investedPercent), marketWeight: pct(marketWeight), targetPercent,
          dataPoints: fund.netWorthHistory.length, dataDate: fund.netWorthHistory.at(-1)?.date ?? fund.netWorthDate,
        };
      });
    });

    return NextResponse.json({ generatedAt: new Date().toISOString(), signals });
  } catch (error) {
    console.error("生成基金策略信号失败:", error);
    return NextResponse.json({ error: "生成基金策略信号失败" }, { status: 500 });
  }
}
