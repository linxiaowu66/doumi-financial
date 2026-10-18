import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUserId } from "@/lib/auth-scope";
import { runTrendBacktest } from "@/lib/portfolio-backtest";

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
    const result = runTrendBacktest(fund.netWorthHistory.slice(-756).map((row) => ({ date: row.date, value: Number(row.netWorth) })), Number(fund.defaultBuyFee), Number(fund.defaultSellFee));
    return { fundId: fund.id, fundCode: fund.code, fundName: fund.name, ...result };
  });
  return NextResponse.json({ generatedAt: new Date().toISOString(), method: "T-1 收盘信号、下一净值点执行；使用单位净值并扣除当前买卖费率，统计换手和交易次数；不含分红、滑点、限购及赎回到账延迟。结果不是未来收益预测。", results, message: results.length === 0 ? "暂无趋势资产可回测；可将基金策略类型设为高风险趋势，或使用成长高风险、创业板、科创板等分类。" : undefined });
}
