import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { fetchQiemanLongwinAssets } from "@/lib/qieman-client";
import { finishDataSyncRun, startDataSyncRun } from "@/lib/data-sync";

function date(value: string) {
  const parsed = new Date(`${value}T00:00:00+08:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function propertyIds(account: { qiemanUserPropertyId: string | null; qiemanUserPropertyIds: string | null }) {
  if (account.qiemanUserPropertyIds) {
    try {
      const parsed = JSON.parse(account.qiemanUserPropertyIds);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed.filter((value): value is string => typeof value === "string" && Boolean(value.trim()));
    } catch { /* legacy value */ }
  }
  return account.qiemanUserPropertyId ? [account.qiemanUserPropertyId] : [];
}

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && request.headers.get("authorization") !== `Bearer ${cronSecret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const accounts = await prisma.strategyAccount.findMany({ where: { platform: "QIEMAN", qiemanBearerToken: { not: null } }, select: { id: true, userId: true, qiemanUserPropertyId: true, qiemanUserPropertyIds: true, qiemanBearerToken: true } });
  const results: Array<{ accountId: number; success: boolean; count?: number; error?: string }> = [];
  for (const account of accounts) {
    const run = await startDataSyncRun(account.userId, "QIEMAN", `account:${account.id}`);
    try {
      const ids = propertyIds(account);
      if (!ids.length || !account.qiemanBearerToken) throw new Error("账户缺少且慢资产标识或 Token");
      const fetched = await Promise.all(ids.map(async (userPropertyId) => ({ userPropertyId, result: await fetchQiemanLongwinAssets(userPropertyId, account.qiemanBearerToken!) })));
      const rowsByKey = new Map<string, { fundCode: string | null; fundName: string; assetClass: string; marketValue: number; weight: number; confidence: number; note: string | null }>();
      for (const { userPropertyId, result } of fetched) for (const row of result.rows) {
        const key = `${row.fundCode || row.fundName}::${row.assetClass}`;
        const current = rowsByKey.get(key);
        if (current) { current.marketValue += row.marketValue; current.weight += row.weight; current.note = `${current.note || "官方接口同步"}；userPropertyId=${userPropertyId}`; }
        else rowsByKey.set(key, { ...row, note: `${row.note || "官方接口同步"}；userPropertyId=${userPropertyId}` });
      }
      const rows = [...rowsByKey.values()];
      const asOfDateText = fetched.map(({ result }) => result.asOfDate).sort().at(-1);
      const asOfDate = asOfDateText ? date(asOfDateText) : null;
      if (!asOfDate || !rows.length) throw new Error("且慢没有返回可保存的持仓数据");
      const totalAsset = fetched.reduce((sum, { result }) => sum + Number(result.summary.totalAsset || 0), 0);
      for (const row of rows) row.weight = totalAsset > 0 ? row.marketValue / totalAsset * 100 : 0;
      await prisma.$transaction(async (tx) => {
        const imported = await tx.strategyAccountImport.create({ data: { strategyAccountId: account.id, asOfDate, sourceType: "QIEMAN_API", sourceFileNames: ids.map((id) => `userPropertyId=${id}`).join(", "), rawJson: JSON.stringify({ accounts: fetched.map(({ userPropertyId, result }) => ({ userPropertyId, metadata: result.metadata, summary: result.summary, rows: result.rows })) }), status: "CONFIRMED" } });
        await tx.strategyAccountHolding.deleteMany({ where: { strategyAccountId: account.id, asOfDate } });
        await tx.strategyAccountHolding.createMany({ data: rows.map((row) => ({ strategyAccountId: account.id, importId: imported.id, asOfDate, fundCode: row.fundCode, fundName: row.fundName, assetClass: row.assetClass, marketValue: row.marketValue, weight: row.weight, confidence: row.confidence, note: row.note })) });
        await tx.strategyAccount.update({ where: { id: account.id }, data: { sourceType: "QIEMAN_API", asOfDate } });
      });
      await finishDataSyncRun(run.id, { status: "SUCCESS", asOfDate: asOfDateText, itemCount: rows.length, detailsJson: { ids, count: rows.length } });
      results.push({ accountId: account.id, success: true, count: rows.length });
    } catch (error) {
      const message = error instanceof Error ? error.message : "同步失败";
      await finishDataSyncRun(run.id, { status: "FAILED", errorMessage: message });
      results.push({ accountId: account.id, success: false, error: message });
    }
  }
  return NextResponse.json({ success: results.every((item) => item.success), results, message: "且慢账户定时同步完成" });
}
