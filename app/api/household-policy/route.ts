import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUserId } from "@/lib/auth-scope";

const DEFAULT_ALLOCATION = { EQUITY: 40, FIXED_INCOME: 30, GOLD: 10, CASH_FLOW: 20, OTHER: 0 };
const CATEGORIES = Object.keys(DEFAULT_ALLOCATION);

function numberValue(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseAllocation(value: unknown) {
  const source = typeof value === "string" ? JSON.parse(value) : value;
  if (!source || typeof source !== "object") throw new Error("目标配置格式无效");
  const allocation = Object.fromEntries(CATEGORIES.map((category) => [category, numberValue((source as Record<string, unknown>)[category])])) as Record<string, number>;
  if (Object.values(allocation).some((item) => item < 0 || item > 100)) throw new Error("目标配置必须在 0-100% 之间");
  const total = Object.values(allocation).reduce((sum, item) => sum + item, 0);
  if (Math.abs(total - 100) > 0.01) throw new Error(`目标配置合计必须为 100%，当前为 ${total.toFixed(2)}%`);
  return allocation;
}

export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const policy = await prisma.householdAssetPolicy.findUnique({ where: { userId } });
  return NextResponse.json(policy ? { ...policy, targetAllocation: JSON.parse(policy.targetAllocationJson) } : {
    annualReturnTarget: 5,
    emergencyCashAmount: 0,
    rebalanceBandPercent: 5,
    targetAllocation: DEFAULT_ALLOCATION,
    reviewFrequency: "MONTHLY",
  });
}

export async function PUT(request: Request) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "未登录" }, { status: 401 });
  try {
    const body = await request.json() as Record<string, unknown>;
    const annualReturnTarget = numberValue(body.annualReturnTarget, 5);
    const emergencyCashAmount = numberValue(body.emergencyCashAmount);
    const rebalanceBandPercent = numberValue(body.rebalanceBandPercent, 5);
    const targetAllocation = parseAllocation(body.targetAllocation);
    if (annualReturnTarget < 0 || annualReturnTarget > 100 || emergencyCashAmount < 0 || rebalanceBandPercent < 0 || rebalanceBandPercent > 50) {
      return NextResponse.json({ error: "家庭资产政策参数超出范围" }, { status: 400 });
    }
    const policy = await prisma.householdAssetPolicy.upsert({
      where: { userId },
      update: { annualReturnTarget, emergencyCashAmount, rebalanceBandPercent, targetAllocationJson: JSON.stringify(targetAllocation), reviewFrequency: "MONTHLY" },
      create: { userId, annualReturnTarget, emergencyCashAmount, rebalanceBandPercent, targetAllocationJson: JSON.stringify(targetAllocation), reviewFrequency: "MONTHLY" },
    });
    return NextResponse.json({ ...policy, targetAllocation });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "保存家庭资产政策失败" }, { status: 400 });
  }
}
