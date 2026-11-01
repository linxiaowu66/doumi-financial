import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth-scope";
import { buildFundSignalResult } from "@/lib/fund-signal-engine";
import { buildInvestmentPlan } from "@/lib/investment-plan";

export async function GET(request: Request) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "未登录" }, { status: 401 });
  try {
    const [signalResult, rebalanceResponse] = await Promise.all([
      buildFundSignalResult(userId),
      fetch(new URL("/api/household-policy/rebalance", request.url), { headers: { cookie: request.headers.get("cookie") || "" }, cache: "no-store" }),
    ]);
    const rebalance = await rebalanceResponse.json();
    if (!rebalanceResponse.ok) return NextResponse.json({ error: rebalance.error || "加载家庭再平衡数据失败" }, { status: 502 });
    return NextResponse.json(buildInvestmentPlan({ household: signalResult.household, signals: signalResult.signals, rebalance }));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "生成家庭投资计划失败" }, { status: 500 });
  }
}
