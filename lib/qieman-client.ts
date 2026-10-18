import { createHash, randomUUID } from "node:crypto";

type QiemanFund = { fundCode?: string; fundName?: string; navDate?: string };
type QiemanAsset = {
  fund?: QiemanFund;
  variety?: string;
  totalAsset?: number | string;
  percent?: number | string;
  totalShare?: number | string;
  holdingProfit?: number | string;
  holdingProfitRate?: number | string;
  latestDailyProfit?: number | string;
  latestDailyProfitRate?: number | string;
  canBuy?: boolean;
  canRedeem?: boolean;
};
type QiemanAssetGroup = { className?: string; classCode?: string; assetList?: QiemanAsset[] };
type QiemanSummary = {
  totalAsset?: number | string;
  shareAsset?: number | string;
  accumulatedProfit?: number | string;
  holdingProfit?: number | string;
  holdingProfitRate?: number | string;
  latestDailyProfit?: number | string;
  latestDailyProfitRate?: number | string;
  profitDate?: number | string;
  planAssetList?: QiemanAssetGroup[];
};

const baseUrl = "https://qieman.com/pmdj/v2";

function number(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sign(now: number) {
  const digest = createHash("sha256").update(String(Math.floor(now * 1.01))).digest("hex").toUpperCase().slice(0, 32);
  return `${now}${digest}`;
}

function tokenHeader(token: string) {
  return token.trim().replace(/^Bearer\s+/i, "");
}

async function qiemanGet<T>(path: string, query: Record<string, string>, token: string) {
  const now = Date.now();
  const url = new URL(`${baseUrl}${path}`);
  Object.entries(query).forEach(([key, value]) => url.searchParams.set(key, value));
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      authorization: `Bearer ${tokenHeader(token)}`,
      "cache-control": "no-store",
      pragma: "no-cache",
      referer: "https://qieman.com/umas",
      "user-agent": "doumi-financial-qieman-sync/1.0",
      "x-request-id": `albus.doumi-${randomUUID()}`,
      "x-sign": sign(now),
    },
    cache: "no-store",
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`且慢接口请求失败（HTTP ${response.status}）：${text.slice(0, 240)}`);
  if (!text.trim()) throw new Error("且慢接口返回为空，请检查 Token 是否仍然有效");
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("且慢接口返回格式无法解析");
  }
}

function dateFromQiemanNav(value: string | undefined) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function dateFromTimestamp(value: unknown) {
  const timestamp = number(value);
  if (!timestamp) return null;
  return new Date(timestamp).toISOString().slice(0, 10);
}

export function mapQiemanAssetClass(classCode?: string, className?: string, fundName?: string) {
  const code = classCode?.toUpperCase() || "";
  const label = `${className || ""} ${fundName || ""}`;
  if (code.includes("STOCK")) return "EQUITY";
  if (code.includes("BOND")) return "FIXED_INCOME";
  if (code.includes("GOLD")) return "GOLD";
  if (code.includes("CASH") || /盈米宝|货币基金|现金管理/.test(label)) return "CASH_FLOW";
  return "OTHER";
}

export function normalizeQiemanHoldingClass(assetClass: string | null | undefined, fundName: string, note: string | null | undefined) {
  if (assetClass === "EQUITY" || assetClass === "FIXED_INCOME" || assetClass === "GOLD" || assetClass === "CASH_FLOW") return assetClass;
  return mapQiemanAssetClass(note, undefined, fundName);
}

export async function fetchQiemanLongwinAssets(userPropertyId: string, token: string) {
  if (!userPropertyId.trim()) throw new Error("缺少且慢 userPropertyId");
  if (!token.trim()) throw new Error("当前且慢策略账户未配置 Token");
  const metadata = await qiemanGet<{ capitalAccountId?: string; type?: string; investType?: string }>("/long-win", { userPropertyId: userPropertyId.trim() }, token);
  if (!metadata.capitalAccountId) throw new Error("且慢账户元数据中没有 capitalAccountId");
  const summary = await qiemanGet<QiemanSummary>("/long-win/ca/assets-summary", {
    capitalAccountId: metadata.capitalAccountId,
    useV2OrderApi: "true",
    classify: "true",
  }, token);
  const rows = (summary.planAssetList || []).flatMap((group) => (group.assetList || []).map((asset) => ({
    fundCode: asset.fund?.fundCode || null,
    fundName: asset.fund?.fundName || asset.variety || "未命名基金",
    assetClass: mapQiemanAssetClass(group.classCode, group.className, asset.fund?.fundName || asset.variety),
    marketValue: number(asset.totalAsset),
    weight: number(asset.percent) * 100,
    confidence: 100,
    note: `${group.className || group.classCode || "且慢"}；官方接口同步`,
    qiemanClass: group.className || group.classCode || null,
    shares: number(asset.totalShare),
    holdingProfit: number(asset.holdingProfit),
    holdingProfitRate: number(asset.holdingProfitRate) * 100,
    dailyProfit: number(asset.latestDailyProfit),
    dailyReturn: number(asset.latestDailyProfitRate) * 100,
    canBuy: asset.canBuy ?? null,
    canRedeem: asset.canRedeem ?? null,
    navDate: dateFromQiemanNav(asset.fund?.navDate),
  })));
  const latestNavDate = rows.map((row) => row.navDate).filter((value): value is string => Boolean(value)).sort().at(-1) || dateFromTimestamp(summary.profitDate);
  if (!latestNavDate) throw new Error("且慢资产数据中没有有效的净值日期");
  return { metadata, summary, rows, asOfDate: latestNavDate };
}
