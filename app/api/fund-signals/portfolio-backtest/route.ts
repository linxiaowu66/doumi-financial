import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUserId } from "@/lib/auth-scope";
import { classifyFundAsset } from "@/lib/fund-asset-classification";
import { runPortfolioBacktestReport } from "@/lib/portfolio-backtest";

const defaults = { EQUITY: 40, FIXED_INCOME: 30, GOLD: 10, CASH_FLOW: 20, OTHER: 0 };

export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const [policy, directions] = await Promise.all([
    prisma.householdAssetPolicy.findUnique({ where: { userId } }),
    prisma.investmentDirection.findMany({
      where: { userId },
      include: { funds: { include: { netWorthHistory: { orderBy: { date: "asc" }, select: { date: true, netWorth: true } } } } },
    }),
  ]);
  const targetAllocation = policy ? JSON.parse(policy.targetAllocationJson) as Record<string, number> : defaults;
  const candidates = directions.flatMap((direction) => direction.funds.map((fund) => ({ directionId: direction.id, directionName: direction.name, fund })));
  const grouped = new Map<string, typeof candidates>();
  for (const candidate of candidates) {
    const assetClass = classifyFundAsset({ actualCategory: candidate.fund.actualCategory, metadataJson: candidate.fund.metadataJson, personalCategory: candidate.fund.category, fundName: candidate.fund.name }).assetClass;
    const rows = grouped.get(assetClass) || [];
    rows.push(candidate);
    grouped.set(assetClass, rows);
  }
  const classifiedCandidates = candidates.map((candidate) => {
    const assetClass = classifyFundAsset({ actualCategory: candidate.fund.actualCategory, metadataJson: candidate.fund.metadataJson, personalCategory: candidate.fund.category, fundName: candidate.fund.name }).assetClass;
    const members = grouped.get(assetClass) || [];
    const target = Number(targetAllocation[assetClass] || 0) / Math.max(1, members.length);
    return { id: candidate.fund.id, name: candidate.fund.name, directionName: candidate.directionName, assetClass, targetPercent: target, buyFeePercent: Number(candidate.fund.defaultBuyFee), sellFeePercent: Number(candidate.fund.defaultSellFee), history: candidate.fund.netWorthHistory.map((row) => ({ date: row.date, value: Number(row.netWorth) })) };
  });
  const funds = classifiedCandidates.filter((fund) => fund.assetClass !== "OTHER" && fund.targetPercent > 0 && fund.history.length >= 126);
  const excludedFunds = classifiedCandidates.filter((fund) => !funds.some((item) => item.id === fund.id)).map((fund) => ({ id: fund.id, name: fund.name, directionName: fund.directionName, assetClass: fund.assetClass, observations: fund.history.length, reason: fund.assetClass === "OTHER" ? "未纳入家庭目标大类" : fund.targetPercent <= 0 ? "目标比例为 0" : "历史净值不足 126 个观察日" }));
  const result = runPortfolioBacktestReport(funds);
  return NextResponse.json({ generatedAt: new Date().toISOString(), targetAllocation, method: "按家庭目标大类平均分配到有历史数据的基金；支持月度/季度再平衡、费率压力测试和训练/验证/盲测；T-1 决策、下一净值点执行、扣除买卖费；未使用且慢缺少历史成分快照的持仓。", result, funds: funds.map(({ history, ...fund }) => ({ ...fund, observations: history.length, firstDate: history[0]?.date || null, lastDate: history.at(-1)?.date || null })), excludedFunds });
}
