import prisma from "@/lib/prisma";
import { calcFundSnapshot } from "@/lib/fund-daily-profit";
import { classifyFundAsset, type FundAssetClass } from "@/lib/fund-asset-classification";
import { allocationCategoryForPlatform } from "@/lib/household-assets";
import { normalizeQiemanHoldingClass } from "@/lib/qieman-client";

type HistoryPoint = { date: string; value: number };
export type SignalAction = "BUY" | "SELL" | "NONE";

export type HouseholdAllocationRow = {
  assetClass: FundAssetClass | "CASH_FLOW";
  value: number;
  percent: number;
};

export type HouseholdStrategySummary = {
  combinedValue: number;
  directionValue: number;
  externalAccountValue: number;
  unclassifiedExternalValue: number;
  rows: HouseholdAllocationRow[];
  accountsNeedingReview: Array<{ name: string; value: number; reason: string }>;
  note: string;
};

export type FundSignal = {
  fundId: number;
  fundCode: string;
  fundName: string;
  directionId: number;
  directionName: string;
  strategyType: "CORE" | "TREND";
  action: SignalAction;
  actionAmount: number;
  signal: string;
  signalRank: number;
  score: number;
  scoreBreakdown: { trend: number; momentum: number; risk: number; allocation: number; data: number };
  reason: string;
  trend: string;
  latestNetWorth: number | null;
  return5: number;
  return20: number;
  return60: number;
  marketValue: number;
  holdingCost: number;
  weight: number;
  marketWeight: number;
  targetPercent: number | null;
  ma20: number | null;
  ma60: number | null;
  volatility20: number | null;
  currentDrawdown: number;
  maxDrawdown: number;
  dataPoints: number;
  dataDate: string | null;
  dataFresh: boolean;
  metadataFresh: boolean;
  metadataCategory: string | null;
  assetClass: FundAssetClass;
};

export type PortfolioRisk = {
  directionId: number;
  directionName: string;
  expectedAmount: number;
  investedAmount: number;
  marketValue: number;
  budgetUsedPercent: number;
  concentrationHHI: number;
  categoryConcentrationHHI: number;
  averageCorrelation: number | null;
  highestCorrelation: number | null;
  stressTests: Array<{ name: string; estimatedLoss: number; note: string }>;
  signalCounts: Record<string, number>;
  dataQuality: { totalFunds: number; heldFunds: number; freshFunds: number; insufficientFunds: number; staleMetadataFunds: number; categoryReviewFunds: number };
  categories: Array<{ category: string; investedAmount: number; targetAmount: number; investedPercent: number; marketWeight: number }>;
};

export type FundSignalResult = { generatedAt: string; asOfDate: string; signals: FundSignal[]; portfolio: PortfolioRisk[]; household: HouseholdStrategySummary };

const pct = (value: number) => Number(value.toFixed(2));
const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
const money = (value: number) => Math.max(0, Math.floor(value / 100) * 100);

function classifyExternalAsset(asset: { name: string; platform: string; strategyName: string | null; remark: string | null }): { assetClass: FundAssetClass | "CASH_FLOW"; review: boolean; reason?: string } {
  const text = `${asset.name} ${asset.remark ?? ""}`;
  if (/股票|证券|券商/.test(text)) return { assetClass: "EQUITY", review: false };
  if (/黄金|贵金属/.test(text)) return { assetClass: "GOLD", review: false };
  if (/债券|固收/.test(text)) return { assetClass: "FIXED_INCOME", review: false };
  if (asset.platform === "YUEBAO" || asset.platform === "PERSONAL_PENSION" || /余额宝|零钱通|现金流|个人养老金/.test(text)) return { assetClass: "CASH_FLOW", review: false };
  if (asset.strategyName) return { assetClass: "OTHER", review: true, reason: `已识别为策略账户（${asset.strategyName}），但尚未录入底层基金持仓` };
  return { assetClass: "OTHER", review: true, reason: "缺少底层持仓，不能确认股票、债券或现金比例" };
}

function movingAverage(history: HistoryPoint[], period: number, end = history.length - 1) {
  if (end + 1 < period) return null;
  return average(history.slice(end - period + 1, end + 1).map((point) => point.value));
}

function periodReturn(history: HistoryPoint[], period: number) {
  if (history.length <= period) return null;
  const start = history[history.length - period - 1].value;
  const end = history.at(-1)?.value ?? start;
  return start > 0 ? ((end / start) - 1) * 100 : null;
}

function annualizedVolatility(history: HistoryPoint[], period = 20) {
  const points = history.slice(-(period + 1));
  if (points.length < period + 1) return null;
  const returns = points.slice(1).map((point, index) => point.value / points[index].value - 1);
  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const variance = returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / returns.length;
  return Math.sqrt(variance) * Math.sqrt(252) * 100;
}

function maxDrawdown(history: HistoryPoint[]) {
  let high = 0;
  let max = 0;
  for (const point of history) {
    high = Math.max(high, point.value);
    if (high > 0) max = Math.max(max, (high - point.value) / high * 100);
  }
  return max;
}

function consecutiveBelow(history: HistoryPoint[], period: number, count: number) {
  if (history.length < period + count - 1) return false;
  for (let offset = 0; offset < count; offset += 1) {
    const end = history.length - 1 - offset;
    const ma = movingAverage(history, period, end);
    if (ma === null || history[end].value >= ma) return false;
  }
  return true;
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function isTrendAsset(strategyType: string | null | undefined, category: string | null) {
  return strategyType === "TREND" || /高风险|创业|科创/.test(category ?? "");
}

function correlation(left: Map<string, number>, right: Map<string, number>) {
  const dates = [...left.keys()].filter((date) => right.has(date)).slice(-60);
  if (dates.length < 10) return null;
  const a = dates.map((date) => left.get(date)!);
  const b = dates.map((date) => right.get(date)!);
  const avgA = a.reduce((sum, value) => sum + value, 0) / dates.length;
  const avgB = b.reduce((sum, value) => sum + value, 0) / dates.length;
  const numerator = a.reduce((sum, value, index) => sum + (value - avgA) * (b[index] - avgB), 0);
  const denominator = Math.sqrt(a.reduce((sum, value) => sum + (value - avgA) ** 2, 0) * b.reduce((sum, value) => sum + (value - avgB) ** 2, 0));
  return denominator > 0 ? numerator / denominator : null;
}

function dailyReturns(history: HistoryPoint[]) {
  const points = history.slice(-61);
  return new Map(points.slice(1).map((point, index) => [point.date, point.value / points[index].value - 1]));
}

export async function buildFundSignalResult(userId: number): Promise<FundSignalResult> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 1);
  const cutoffKey = dayKey(cutoff);
  const [directions, householdAssets] = await Promise.all([
    prisma.investmentDirection.findMany({
      where: { userId },
      include: {
        funds: {
          include: {
            transactions: { orderBy: [{ date: "asc" }, { id: "asc" }] },
            netWorthHistory: { orderBy: { date: "asc" }, select: { date: true, netWorth: true } },
          },
        },
        categoryTargets: true,
      },
    }),
    prisma.householdAsset.findMany({ where: { userId }, select: { name: true, platform: true, strategyName: true, balance: true, remark: true, strategyAccount: { select: { id: true, holdings: { orderBy: [{ asOfDate: "desc" }, { marketValue: "desc" }] } } } } }),
  ]);

  const signals: FundSignal[] = [];
  const portfolio: PortfolioRisk[] = [];
  for (const direction of directions) {
    const expectedAmount = Number(direction.expectedAmount ?? 0);
    const directionSignals: FundSignal[] = [];
    const buyCandidates: Array<{ fundId: number; item?: FundSignal; gap: number; priority: number; reason: string }> = [];
    const series = new Map<number, Map<string, number>>();
    const fundData = new Map<number, { history: HistoryPoint[]; latest: number; marketValue: number; holdingCost: number }>();
    const categoryHoldingCosts = new Map<string, number>();
    const categoryMarketValues = new Map<string, number>();
    for (const fund of direction.funds) {
      const history: HistoryPoint[] = fund.netWorthHistory
        .filter((row) => String(row.date).slice(0, 10) <= cutoffKey)
        .map((row) => ({ date: String(row.date).slice(0, 10), value: Number(row.netWorth) }))
        .filter((point) => Number.isFinite(point.value) && point.value > 0);
      const latest = history.at(-1)?.value ?? 0;
      const snapshot = calcFundSnapshot(fund.transactions, latest || null);
      const marketValue = Number(snapshot.holdingValue);
      const holdingCost = Number(snapshot.holdingCost);
      fundData.set(fund.id, { history, latest, marketValue, holdingCost });
      const category = fund.category ?? "未分类";
      categoryHoldingCosts.set(category, (categoryHoldingCosts.get(category) ?? 0) + holdingCost);
      categoryMarketValues.set(category, (categoryMarketValues.get(category) ?? 0) + marketValue);
    }
    for (const fund of direction.funds) {
      const { history, latest, marketValue, holdingCost } = fundData.get(fund.id)!;
      const dataDate = history.at(-1)?.date ?? null;
      const target = direction.categoryTargets.find((item) => item.categoryName === fund.category);
      const classification = classifyFundAsset({ actualCategory: fund.actualCategory, metadataJson: fund.metadataJson, personalCategory: fund.category, fundName: fund.name });
      const targetPercent = target ? Number(target.targetPercent) : null;
      const investedPercent = expectedAmount > 0 ? holdingCost / expectedAmount * 100 : 0;
      const categoryInvestedPercent = expectedAmount > 0 ? (categoryHoldingCosts.get(fund.category ?? "未分类") ?? 0) / expectedAmount * 100 : 0;
      const ma20 = movingAverage(history, 20);
      const ma60 = movingAverage(history, 60);
      const return5 = periodReturn(history, 5);
      const return20 = periodReturn(history, 20);
      const return60 = periodReturn(history, 60);
      const volatility20 = annualizedVolatility(history);
      const high = history.reduce((value, point) => Math.max(value, point.value), 0);
      const drawdown = high > 0 ? (high - latest) / high * 100 : 0;
      const historicalMaxDrawdown = maxDrawdown(history);
      const tactical = isTrendAsset(fund.strategyType, fund.category);
      const enoughData = history.length >= 20 && ma20 !== null && return20 !== null;
      const dataAgeDays = dataDate ? Math.max(0, Math.floor((cutoff.getTime() - new Date(dataDate).getTime()) / 86400000)) : null;
      const stale = dataAgeDays !== null && dataAgeDays > 5;
      const metadataFetchedAt = fund.metadataFetchedAt?.getTime() ?? 0;
      const metadataFresh = metadataFetchedAt > 0 && Date.now() - metadataFetchedAt < 180 * 86400000;
      const metadataCategory = fund.actualCategory ?? null;
      const categoryReview = classification.categoryReview;
      const below20 = ma20 !== null && latest < ma20;
      const mediumTrendBreak = ma20 !== null && ma60 !== null && latest < ma60 && ma20 < ma60 && (return20 ?? 0) < 0;
      const confirmedTrendBreak = consecutiveBelow(history, 20, 2) && mediumTrendBreak;
      const highDrawdown = drawdown >= 15;
      const riskElevated = volatility20 !== null && volatility20 >= 35;
      const holdingTrendAsset = tactical && holdingCost > 0 && marketValue > 1;
      const trendScore = ma60 === null ? 10 : latest > ma20! && latest > ma60 ? 30 : latest > ma60 ? 20 : latest > ma20! ? 10 : 0;
      const momentumScore = (return20 ?? 0) > 0 && (return60 ?? 0) > 0 ? 20 : (return20 ?? 0) > 0 || (return60 ?? 0) > 0 ? 10 : 0;
      const riskScore = drawdown < 8 && (volatility20 ?? 0) < 20 ? 20 : drawdown < 15 && (volatility20 ?? 0) < 35 ? 12 : drawdown < 25 ? 5 : 0;
      const targetScore = targetPercent === null || targetPercent <= 0 ? 10 : categoryInvestedPercent < targetPercent ? 20 : 0;
      const dataScore = enoughData && !stale ? 10 : 0;
      const scoreBreakdown = { trend: trendScore, momentum: momentumScore, risk: riskScore, allocation: targetScore, data: dataScore };
      const score = Object.values(scoreBreakdown).reduce((sum, value) => sum + value, 0);
      const categoryMarketValue = categoryMarketValues.get(fund.category ?? "未分类") ?? 0;
      const targetAmount = expectedAmount > 0 && targetPercent !== null ? expectedAmount * targetPercent / 100 : 0;
      const categoryGap = Math.max(0, targetAmount - categoryMarketValue);
      const recoveryBuy = categoryGap > 0 && drawdown >= 12 && latest > (ma20 ?? latest) && (return5 ?? 0) > 0;
      const trendBuy = categoryGap > 0 && latest > (ma20 ?? latest) && (ma60 === null || latest > ma60) && (return20 ?? 0) > 0;
      const buyReady = enoughData && !stale && targetPercent !== null && targetPercent > 0 && !confirmedTrendBreak && (recoveryBuy || trendBuy);
      let buyCandidate: (typeof buyCandidates)[number] | null = null;
      let signal = "持有";
      let signalRank = 0;
      const reasons: string[] = [];
      if (!enoughData) {
        signal = "数据不足";
        reasons.push("至少需要 21 个已确认净值点");
      } else if (stale) {
        signal = "数据过旧";
        reasons.push(`最新净值为 ${dataDate}，请先同步净值`);
      } else if (holdingTrendAsset && confirmedTrendBreak) {
        signal = "分批卖出";
        signalRank = 4;
        reasons.push("连续跌破 20 日均线、20 日均线低于 60 日均线");
      } else if (holdingTrendAsset && (highDrawdown || (below20 && (return20 ?? 0) < 0) || (riskElevated && mediumTrendBreak))) {
        signal = "减仓观察";
        signalRank = 3;
        if (highDrawdown) reasons.push(`距离历史高点回撤 ${drawdown.toFixed(1)}%`);
        if (below20) reasons.push("低于 20 日均线且近 20 日为负");
        if (riskElevated) reasons.push(`20 日年化波动率 ${volatility20!.toFixed(1)}%`);
      } else if (below20 && (return5 ?? 0) < 0) {
        signal = "暂缓加仓";
        signalRank = 2;
        reasons.push("低于 20 日均线且短期趋势转弱");
      } else if (buyReady) {
        reasons.push(recoveryBuy ? "历史回撤后重新站上 20 日均线，短期动能恢复" : "短期和中期趋势没有明显破坏，且分类仍有目标缺口");
        reasons.push(`综合评分 ${score}/100`);
        reasons.push(`分类当前市值占预期 ${expectedAmount > 0 ? (categoryMarketValue / expectedAmount * 100).toFixed(1) : "0.0"}%，目标缺口约 ¥${categoryGap.toFixed(0)}`);
        buyCandidate = { fundId: fund.id, gap: categoryGap, priority: recoveryBuy ? 3 : tactical ? 2 : 1, reason: reasons.join("；") };
        buyCandidates.push(buyCandidate);
      } else {
        reasons.push(tactical ? "趋势暂未触发退出条件" : "核心资产按长期持有规则观察");
      }
      if (!metadataFresh) reasons.push("基金官方资料超过 180 天未更新");
      if (categoryReview) reasons.push(`个人分类与官方分类可能不一致（${metadataCategory}）`);
      const signalItem: FundSignal = {
        fundId: fund.id, fundCode: fund.code, fundName: fund.name, directionId: direction.id, directionName: direction.name,
        strategyType: tactical ? "TREND" : "CORE", action: signal === "分批卖出" ? "SELL" : "NONE", actionAmount: signal === "分批卖出" ? money(marketValue * 0.25) : 0, signal, signalRank, score, scoreBreakdown, reason: reasons.join("；"), trend: below20 ? "弱于20日均线" : "高于20日均线",
        latestNetWorth: latest || null, return5: pct(return5 ?? 0), return20: pct(return20 ?? 0), return60: pct(return60 ?? 0), marketValue: pct(marketValue), holdingCost: pct(holdingCost), weight: pct(investedPercent), marketWeight: 0, targetPercent,
        ma20: ma20 === null ? null : pct(ma20), ma60: ma60 === null ? null : pct(ma60), volatility20: volatility20 === null ? null : pct(volatility20), currentDrawdown: pct(drawdown), maxDrawdown: pct(historicalMaxDrawdown), dataPoints: history.length, dataDate, dataFresh: !stale, metadataFresh, metadataCategory, assetClass: classification.assetClass,
      };
      if (buyCandidate) buyCandidate.item = signalItem;
      if (signalItem.action === "SELL" && signalItem.actionAmount > 0) {
        signalItem.reason = `${signalItem.reason}；建议卖出约 ¥${signalItem.actionAmount.toLocaleString()}（当前市值的 25%，分批执行）`;
      }
      directionSignals.push(signalItem);
      if (holdingCost > 0 && marketValue > 1) series.set(fund.id, dailyReturns(history));
    }

    const directionHoldingCost = directionSignals.reduce((sum, item) => sum + item.holdingCost, 0);
    const directionBudget = Math.max(0, expectedAmount - directionHoldingCost);
    const selectedByCategory = new Map<string, typeof buyCandidates[number]>();
    for (const candidate of buyCandidates) {
      if (!candidate.item) continue;
      const category = direction.funds.find((fund) => fund.id === candidate.fundId)?.category ?? "未分类";
      const current = selectedByCategory.get(category);
      if (!current || candidate.priority > current.priority || (candidate.priority === current.priority && candidate.item.score > (current.item?.score ?? 0))) selectedByCategory.set(category, candidate);
    }
    const categoryCount = selectedByCategory.size;
    for (const candidate of selectedByCategory.values()) {
      if (!candidate.item) continue;
      const actionAmount = money(Math.min(candidate.gap * 0.25, categoryCount > 0 ? directionBudget / categoryCount : 0));
      if (actionAmount < 100) continue;
      candidate.item.action = "BUY";
      candidate.item.actionAmount = actionAmount;
      candidate.item.signal = "分批买入";
      candidate.item.signalRank = 1;
      candidate.item.reason = `${candidate.reason}；建议买入约 ¥${actionAmount.toLocaleString()}（目标缺口的 25%，不超过方向剩余预算）`;
    }
    signals.push(...directionSignals);

    const marketValue = directionSignals.reduce((sum, item) => sum + item.marketValue, 0);
    for (const item of directionSignals) item.marketWeight = marketValue > 0 ? pct(item.marketValue / marketValue * 100) : 0;
    const concentrationHHI = directionSignals.reduce((sum, item) => sum + (item.marketWeight / 100) ** 2, 0) * 100;
    const categories = new Map<string, { investedAmount: number; marketValue: number; targetPercent: number }>();
    const categoryByFund = new Map(direction.funds.map((fund) => [fund.id, fund.category ?? "未分类"]));
    for (const item of directionSignals) {
      const category = categoryByFund.get(item.fundId) ?? "未分类";
      const target = direction.categoryTargets.find((entry) => entry.categoryName === category);
      const current = categories.get(category) ?? { investedAmount: 0, marketValue: 0, targetPercent: target ? Number(target.targetPercent) : 0 };
      current.investedAmount += item.holdingCost;
      current.marketValue += item.marketValue;
      categories.set(category, current);
    }
    const categoryRows = [...categories.entries()].map(([category, value]) => ({ category, ...value }));
    const categoryMarketTotal = categoryRows.reduce((sum, item) => sum + item.marketValue, 0);
    const categoryConcentrationHHI = categoryRows.reduce((sum, item) => sum + (categoryMarketTotal > 0 ? item.marketValue / categoryMarketTotal * 100 / 100 : 0) ** 2, 0) * 100;
    const correlations: number[] = [];
    const entries = [...series.entries()];
    for (let i = 0; i < entries.length; i += 1) for (let j = i + 1; j < entries.length; j += 1) {
      const value = correlation(entries[i][1], entries[j][1]);
      if (value !== null) correlations.push(value);
    }
    const signalCounts = directionSignals.reduce<Record<string, number>>((counts, item) => { counts[item.signal] = (counts[item.signal] ?? 0) + 1; return counts; }, {});
    const marketFor = (assetClass: FundAssetClass) => directionSignals.filter((item) => item.assetClass === assetClass).reduce((sum, item) => sum + item.marketValue, 0);
    const stressTests = [
      { name: "权益资产下跌 20%", estimatedLoss: pct(marketFor("EQUITY") * 0.2), note: "优先按基金官方分类和 metadata 识别，个人分类仅作兜底" },
      { name: "黄金资产下跌 10%", estimatedLoss: pct(marketFor("GOLD") * 0.1), note: "官方分类缺少黄金细分时参考个人分类" },
      { name: "固收资产下跌 5%", estimatedLoss: pct(marketFor("FIXED_INCOME") * 0.05), note: "优先按基金官方分类和 metadata 识别" },
    ];
    const heldSignals = directionSignals.filter((item) => item.holdingCost > 0 && item.marketValue > 1);
    if (heldSignals.length === 0) continue;
    portfolio.push({ directionId: direction.id, directionName: direction.name, expectedAmount, investedAmount: pct(directionSignals.reduce((sum, item) => sum + item.holdingCost, 0)), marketValue: pct(marketValue), budgetUsedPercent: expectedAmount > 0 ? pct(directionSignals.reduce((sum, item) => sum + item.holdingCost, 0) / expectedAmount * 100) : 0, concentrationHHI: pct(concentrationHHI), categoryConcentrationHHI: pct(categoryConcentrationHHI), averageCorrelation: correlations.length ? pct(correlations.reduce((sum, value) => sum + value, 0) / correlations.length * 100) : null, highestCorrelation: correlations.length ? pct(Math.max(...correlations) * 100) : null, stressTests, signalCounts, dataQuality: { totalFunds: directionSignals.length, heldFunds: heldSignals.length, freshFunds: heldSignals.filter((item) => item.dataFresh).length, insufficientFunds: heldSignals.filter((item) => item.signal === "数据不足").length, staleMetadataFunds: heldSignals.filter((item) => !item.metadataFresh).length, categoryReviewFunds: heldSignals.filter((item) => item.metadataCategory && item.reason.includes("官方分类")).length }, categories: categoryRows.map((item) => ({ category: item.category, investedAmount: pct(item.investedAmount), targetAmount: pct(expectedAmount * item.targetPercent / 100), investedPercent: expectedAmount > 0 ? pct(item.investedAmount / expectedAmount * 100) : 0, marketWeight: categoryMarketTotal > 0 ? pct(item.marketValue / categoryMarketTotal * 100) : 0 })) });
  }
  const allocation = new Map<FundAssetClass | "CASH_FLOW", number>();
  let directionValue = 0;
  for (const item of signals) {
    if (item.marketValue <= 0) continue;
    directionValue += item.marketValue;
    allocation.set(item.assetClass, (allocation.get(item.assetClass) ?? 0) + item.marketValue);
  }
  const accountsNeedingReview: HouseholdStrategySummary["accountsNeedingReview"] = [];
  const possibleDuplicateAccounts = householdAssets.filter((asset) => /且慢|华泰/.test(asset.name)).map((asset) => asset.name);
  let externalAccountValue = 0;
  let unclassifiedExternalValue = 0;
  for (const asset of householdAssets) {
    const value = Number(asset.balance);
    if (!Number.isFinite(value) || value <= 0) continue;
    externalAccountValue += value;
    const holdings = asset.strategyAccount?.holdings ?? [];
    const latestDate = holdings.map((holding) => new Date(holding.asOfDate).toISOString().slice(0, 10)).sort().at(-1);
    const latestHoldings = asset.platform === "QIEMAN" && latestDate
      ? holdings.filter((holding) => new Date(holding.asOfDate).toISOString().slice(0, 10) === latestDate)
      : [];
    if (latestHoldings.length > 0) {
      const holdingValue = latestHoldings.reduce((sum, holding) => sum + Number(holding.marketValue), 0);
      for (const holding of latestHoldings) {
        const category = allocationCategoryForPlatform(normalizeQiemanHoldingClass(holding.assetClass, holding.fundName, holding.note));
        allocation.set(category, (allocation.get(category) ?? 0) + Number(holding.marketValue));
      }
      const residual = value - holdingValue;
      if (residual > 0.01) {
        allocation.set("OTHER", (allocation.get("OTHER") ?? 0) + residual);
        unclassifiedExternalValue += residual;
        accountsNeedingReview.push({ name: asset.name, value: pct(residual), reason: "且慢账户余额与最新底层持仓合计存在差额" });
      }
      continue;
    }
    const classification = classifyExternalAsset(asset);
    allocation.set(classification.assetClass, (allocation.get(classification.assetClass) ?? 0) + value);
    if (classification.review) {
      unclassifiedExternalValue += value;
      accountsNeedingReview.push({ name: asset.name, value: pct(value), reason: classification.reason ?? "资产类别待确认" });
    }
  }
  const combinedValue = directionValue + externalAccountValue;
  const rows = [...allocation.entries()].map(([assetClass, value]) => ({ assetClass, value: pct(value), percent: combinedValue > 0 ? pct(value / combinedValue * 100) : 0 }));
  const householdNotes = [];
  if (accountsNeedingReview.length > 0) householdNotes.push("外部账户没有底层持仓明细，暂不把待确认金额用于基金买卖金额计算；补充分类后再纳入家庭配比");
  if (possibleDuplicateAccounts.length > 0 && directionValue > 0) householdNotes.push(`请确认 ${possibleDuplicateAccounts.join("、")} 是否已包含投资方向里的基金，避免重复计算`);
  const household: HouseholdStrategySummary = {
    combinedValue: pct(combinedValue),
    directionValue: pct(directionValue),
    externalAccountValue: pct(externalAccountValue),
    unclassifiedExternalValue: pct(unclassifiedExternalValue),
    rows,
    accountsNeedingReview,
    note: householdNotes.length > 0 ? `${householdNotes.join("；")}。` : "家庭资产已按当前可识别的基金分类和账户名称汇总。",
  };
  return { generatedAt: new Date().toISOString(), asOfDate: cutoffKey, signals, portfolio, household };
}
