import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUserId } from "@/lib/auth-scope";
import { fetchQiemanLongwinAssets } from "@/lib/qieman-client";
import { finishDataSyncRun, startDataSyncRun } from "@/lib/data-sync";

function date(value: string) {
  const parsed = new Date(`${value}T00:00:00+08:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function accountPropertyIds(account: { qiemanUserPropertyId: string | null; qiemanUserPropertyIds: string | null }) {
  if (account.qiemanUserPropertyIds) {
    try {
      const parsed = JSON.parse(account.qiemanUserPropertyIds);
      if (Array.isArray(parsed)) {
        const ids = parsed.filter((value): value is string => typeof value === "string" && Boolean(value.trim())).map((value) => value.trim());
        if (ids.length > 0) return [...new Set(ids)];
      }
    } catch {
      // Fall back to the legacy single-id column below.
    }
  }
  return account.qiemanUserPropertyId ? [account.qiemanUserPropertyId] : [];
}

export async function POST(request: Request) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "未登录" }, { status: 401 });
  let syncRunId: number | null = null;
  try {
    const body = await request.json() as { accountId?: number };
    const accountId = Number(body.accountId);
    const account = await prisma.strategyAccount.findFirst({
      where: { id: accountId, userId, platform: "QIEMAN" },
      select: { id: true, qiemanUserPropertyId: true, qiemanUserPropertyIds: true, qiemanBearerToken: true },
    });
    if (!account) return NextResponse.json({ error: "且慢策略账户不存在" }, { status: 404 });
    const propertyIds = accountPropertyIds(account);
    if (propertyIds.length === 0) return NextResponse.json({ error: "该账户还没有配置且慢 userPropertyId" }, { status: 400 });
    const token = account.qiemanBearerToken || "";
    if (!token) return NextResponse.json({ error: "该账户还没有配置且慢 Token" }, { status: 400 });
    const syncRun = await startDataSyncRun(userId, "QIEMAN", `account:${accountId}`);
    syncRunId = syncRun.id;
    const results = await Promise.all(propertyIds.map(async (userPropertyId) => ({ userPropertyId, result: await fetchQiemanLongwinAssets(userPropertyId, token) })));
    const rowsByKey = new Map<string, { fundCode: string | null; fundName: string; assetClass: string; marketValue: number; weight: number; confidence: number; note: string | null }>();
    for (const { userPropertyId, result } of results) {
      for (const row of result.rows) {
        const key = `${row.fundCode || row.fundName}::${row.assetClass}`;
        const current = rowsByKey.get(key);
        if (!current) {
          rowsByKey.set(key, { ...row, note: `${row.note || "官方接口同步"}；userPropertyId=${userPropertyId}` });
        } else {
          current.marketValue += row.marketValue;
          current.weight += row.weight;
          current.note = `${current.note || "官方接口同步"}；userPropertyId=${userPropertyId}`;
        }
      }
    }
    const rows = [...rowsByKey.values()];
    const asOfDateText = results.map(({ result }) => result.asOfDate).sort().at(-1);
    const asOfDate = asOfDateText ? date(asOfDateText) : null;
    if (!asOfDate || rows.length === 0) {
      await finishDataSyncRun(syncRun.id, { status: "FAILED", errorMessage: "且慢没有返回可保存的持仓数据" });
      return NextResponse.json({ error: "且慢没有返回可保存的持仓数据" }, { status: 502 });
    }
    const totalAsset = results.reduce((sum, { result }) => sum + Number(result.summary.totalAsset || 0), 0);
    const shareAsset = results.reduce((sum, { result }) => sum + Number(result.summary.shareAsset || 0), 0);
    const holdingProfit = results.reduce((sum, { result }) => sum + Number(result.summary.holdingProfit || 0), 0);
    for (const row of rows) row.weight = totalAsset > 0 ? (row.marketValue / totalAsset) * 100 : 0;
    const saved = await prisma.$transaction(async (tx) => {
      const imported = await tx.strategyAccountImport.create({
        data: {
          strategyAccountId: account.id,
          asOfDate,
          sourceType: "QIEMAN_API",
          sourceFileNames: propertyIds.map((userPropertyId) => `userPropertyId=${userPropertyId}`).join(", "),
          rawJson: JSON.stringify({ accounts: results.map(({ userPropertyId, result }) => ({ userPropertyId, metadata: result.metadata, summary: result.summary, rows: result.rows })) }),
          status: "CONFIRMED",
        },
      });
      await tx.strategyAccountHolding.deleteMany({ where: { strategyAccountId: account.id, asOfDate } });
      await tx.strategyAccountHolding.createMany({
        data: rows.map((row) => ({
          strategyAccountId: account.id,
          importId: imported.id,
          asOfDate,
          fundCode: row.fundCode,
          fundName: row.fundName,
          assetClass: row.assetClass,
          marketValue: row.marketValue,
          weight: row.weight,
          confidence: row.confidence,
          note: row.note,
        })),
      });
      return tx.strategyAccount.update({ where: { id: account.id }, data: { sourceType: "QIEMAN_API", asOfDate } });
    });
    await finishDataSyncRun(syncRun.id, { status: "SUCCESS", asOfDate: asOfDateText, itemCount: rows.length, detailsJson: { propertyIds, count: rows.length } });
    return NextResponse.json({
      success: true,
      account: saved,
      count: rows.length,
      asOfDate: asOfDateText,
      totalAsset,
      shareAsset,
      holdingProfit,
      accountCount: propertyIds.length,
      note: "本次同步的是多个且慢长赢子账户，已合并为策略账户快照，未覆盖合并家庭资产余额。",
    });
  } catch (error) {
    if (syncRunId !== null) await finishDataSyncRun(syncRunId, { status: "FAILED", errorMessage: error instanceof Error ? error.message : "同步且慢资产失败" });
    return NextResponse.json({ error: error instanceof Error ? error.message : "同步且慢资产失败" }, { status: 502 });
  }
}
