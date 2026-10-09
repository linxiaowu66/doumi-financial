import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUserId } from "@/lib/auth-scope";
import { fetchFundMetadata } from "@/lib/fund-metadata";

export async function POST() {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const funds = await prisma.fund.findMany({ where: { direction: { userId } }, select: { id: true, code: true, name: true } });
  const results: Array<{ id: number; name: string; success: boolean; error?: string }> = [];
  for (const fund of funds) {
    try {
      const metadata = await fetchFundMetadata(fund.code);
      await prisma.fund.update({ where: { id: fund.id }, data: { ...metadata, metadataFetchedAt: new Date() } });
      results.push({ id: fund.id, name: fund.name, success: true });
    } catch (error) {
      results.push({ id: fund.id, name: fund.name, success: false, error: error instanceof Error ? error.message : "同步失败" });
    }
  }
  return NextResponse.json({ total: funds.length, success: results.filter((item) => item.success).length, results });
}
