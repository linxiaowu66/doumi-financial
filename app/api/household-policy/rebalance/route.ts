import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUserId } from "@/lib/auth-scope";

const categories = ["EQUITY", "FIXED_INCOME", "GOLD", "CASH_FLOW", "OTHER"] as const;

export async function GET(request: Request) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const [policy, householdResponse] = await Promise.all([
    prisma.householdAssetPolicy.findUnique({ where: { userId } }),
    fetch(new URL("/api/household-assets", request.url), { headers: { cookie: request.headers.get("cookie") || "" }, cache: "no-store" }),
  ]);
  const household = await householdResponse.json() as { allocationCurrent?: Array<{ category: string; value: number }>; assets?: Array<{ balance: string }>; allocationScopeNote?: string };
  if (!householdResponse.ok) return NextResponse.json({ error: "加载家庭资产配置失败" }, { status: 502 });
  const targetAllocation = policy ? JSON.parse(policy.targetAllocationJson) as Record<string, number> : { EQUITY: 40, FIXED_INCOME: 30, GOLD: 10, CASH_FLOW: 20, OTHER: 0 };
  const band = Number(policy?.rebalanceBandPercent ?? 5);
  const currentByCategory = new Map((household.allocationCurrent || []).map((row) => [row.category, Number(row.value)]));
  const total = [...currentByCategory.values()].reduce((sum, value) => sum + value, 0);
  const rows = categories.map((category) => {
    const currentValue = currentByCategory.get(category) || 0;
    const currentPercent = total > 0 ? currentValue / total * 100 : 0;
    const targetPercent = Number(targetAllocation[category] || 0);
    const targetValue = total * targetPercent / 100;
    const gapAmount = targetValue - currentValue;
    const outsideBand = Math.abs(currentPercent - targetPercent) > band;
    return { category, currentValue, currentPercent, targetPercent, targetValue, gapAmount, recommendedAction: outsideBand ? gapAmount > 0 ? "BUY" : "SELL" : "NONE", recommendedAmount: outsideBand ? Math.abs(gapAmount) : 0, status: outsideBand ? gapAmount > 0 ? "UNDERWEIGHT" : "OVERWEIGHT" : "WITHIN_BAND" };
  });
  const cashFlow = rows.find((row) => row.category === "CASH_FLOW");
  const emergencyCashAmount = Number(policy?.emergencyCashAmount ?? 0);
  return NextResponse.json({ total, generatedAt: new Date().toISOString(), band, emergencyCashAmount, cashReserveGap: Math.max(0, emergencyCashAmount - (cashFlow?.currentValue || 0)), rows, note: "金额是家庭层面的再平衡参考，不是自动交易订单；实际买入来源应优先使用新增现金，卖出前请确认税费、赎回到账和现金安全垫。" });
}
