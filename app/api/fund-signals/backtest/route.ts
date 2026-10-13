import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUserId } from "@/lib/auth-scope";

function stats(returns: number[]) {
  let value = 1;
  let high = 1;
  let maxDrawdown = 0;
  for (const change of returns) {
    value *= 1 + change;
    high = Math.max(high, value);
    maxDrawdown = Math.max(maxDrawdown, (high - value) / high);
  }
  const years = returns.length / 252;
  return { totalReturn: (value - 1) * 100, annualizedReturn: years > 0 ? (value ** (1 / years) - 1) * 100 : 0, maxDrawdown: maxDrawdown * 100 };
}

export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const funds = await prisma.fund.findMany({
    where: {
      direction: { userId },
      OR: [
        { strategyType: "TREND" },
        { category: { contains: "高风险" } },
        { category: { contains: "创业" } },
        { category: { contains: "科创" } },
      ],
    },
    select: { id: true, code: true, name: true, strategyType: true, category: true, defaultBuyFee: true, defaultSellFee: true, netWorthHistory: { orderBy: { date: "asc" }, select: { date: true, netWorth: true } } },
  });
  const results = funds.map((fund) => {
    const history = fund.netWorthHistory.slice(-756).map((row) => Number(row.netWorth)).filter((value) => Number.isFinite(value) && value > 0);
    if (history.length < 126) return { fundId: fund.id, fundCode: fund.code, fundName: fund.name, enoughData: false, observations: history.length };
    const fees = (Number(fund.defaultBuyFee) + Number(fund.defaultSellFee)) / 100;
    const strategyReturns: number[] = [];
    const buyHoldReturns: number[] = [];
    let invested = false;
    for (let index = 60; index < history.length; index += 1) {
      const prev = index - 1;
      const ma20 = history.slice(prev - 19, prev + 1).reduce((sum, value) => sum + value, 0) / 20;
      const ma60 = history.slice(prev - 59, prev + 1).reduce((sum, value) => sum + value, 0) / 60;
      const nextInvested = history[prev] > ma20 && history[prev] > ma60;
      const change = history[index] / history[prev] - 1;
      strategyReturns.push((nextInvested ? change : 0) - (nextInvested !== invested ? fees / 2 : 0));
      buyHoldReturns.push(change);
      invested = nextInvested;
    }
    return { fundId: fund.id, fundCode: fund.code, fundName: fund.name, enoughData: true, observations: history.length, strategy: stats(strategyReturns), buyAndHold: stats(buyHoldReturns) };
  });
  return NextResponse.json({ generatedAt: new Date().toISOString(), method: "T-1 收盘信号、下一净值点执行；仅用单位净值，费用按当前基金费率粗估，不含分红、滑点、限购及赎回到账延迟。结果不是未来收益预测。", results, message: results.length === 0 ? "暂无趋势资产可回测；可将基金策略类型设为高风险趋势，或使用成长高风险、创业板、科创板等分类。" : undefined });
}
