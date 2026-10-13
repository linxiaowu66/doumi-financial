import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth-scope";
import { buildFundSignalResult } from "@/lib/fund-signal-engine";

export async function GET() {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return NextResponse.json({ error: "未登录" }, { status: 401 });
    return NextResponse.json(await buildFundSignalResult(userId));
  } catch (error) {
    console.error("生成基金策略信号失败:", error);
    return NextResponse.json({ error: "生成基金策略信号失败" }, { status: 500 });
  }
}
