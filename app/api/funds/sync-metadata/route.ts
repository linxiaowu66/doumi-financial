import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUserId } from "@/lib/auth-scope";
import { fetchFundMetadata } from "@/lib/fund-metadata";
import { finishDataSyncRun, startDataSyncRun } from "@/lib/data-sync";

export async function POST() {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const syncRun = await startDataSyncRun(userId, "METADATA", "all");
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
  const success = results.filter((item) => item.success).length;
  await finishDataSyncRun(syncRun.id, { status: success > 0 || funds.length === 0 ? "SUCCESS" : "FAILED", itemCount: success, errorMessage: success < funds.length ? `${funds.length - success} 个基金资料同步失败` : null, detailsJson: { total: funds.length, success } });
  return NextResponse.json({ total: funds.length, success, results });
}
