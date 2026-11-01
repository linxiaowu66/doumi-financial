export type InvestmentPlanGate = "READY" | "REVIEW" | "BLOCKED";

export interface InvestmentPlanInput {
  household: {
    combinedValue: number;
    unclassifiedExternalValue: number;
    accountsNeedingReview: Array<{ name: string; value: number; reason: string }>;
  };
  rebalance: {
    cashReserveGap: number;
    rows: Array<{
      category: string;
      currentPercent: number;
      targetPercent: number;
      gapAmount: number;
      recommendedAction: string;
      recommendedAmount: number;
      status: string;
    }>;
  };
  signals: Array<{
    fundId: number;
    fundName: string;
    directionName: string;
    action: "BUY" | "SELL" | "NONE";
    actionAmount: number;
    signal: string;
    signalRank: number;
    reason: string;
    dataFresh: boolean;
    dataPoints: number;
  }>;
}

export interface InvestmentPlanAction {
  key: string;
  kind: "BUY" | "SELL" | "REVIEW";
  title: string;
  amount: number;
  priority: number;
  reason: string;
  fundId?: number;
}

export interface InvestmentPlan {
  gate: InvestmentPlanGate;
  decision: string;
  guardrails: string[];
  actions: InvestmentPlanAction[];
  reviewItems: string[];
  generatedAt: string;
}

export function buildInvestmentPlan(input: InvestmentPlanInput, generatedAt = new Date().toISOString()): InvestmentPlan {
  const guardrails: string[] = [];
  const reviewItems = input.household.accountsNeedingReview.map((item) => `${item.name}：${item.reason}`);
  const cashBlocked = input.rebalance.cashReserveGap > 0;
  const classificationBlocked = input.household.unclassifiedExternalValue > 0;
  if (cashBlocked) guardrails.push(`现金安全垫还缺 ¥${input.rebalance.cashReserveGap.toLocaleString()}，暂停新增买入`);
  if (classificationBlocked) guardrails.push(`有 ¥${input.household.unclassifiedExternalValue.toLocaleString()} 外部资产未完成底层分类`);
  const hasStaleSignals = input.signals.some((item) => item.action !== "NONE" && (!item.dataFresh || item.dataPoints < 20));
  if (hasStaleSignals) guardrails.push("部分信号数据不足或过旧，执行前先更新净值");

  const actions: InvestmentPlanAction[] = [];
  for (const signal of input.signals.filter((item) => item.action !== "NONE" && item.actionAmount > 0)) {
    if (signal.action === "BUY" && (cashBlocked || classificationBlocked)) continue;
    actions.push({
      key: `fund-${signal.fundId}`,
      kind: signal.action === "BUY" ? "BUY" : "SELL",
      title: `${signal.action === "BUY" ? "分批买入" : "分批卖出"} · ${signal.fundName}`,
      amount: signal.actionAmount,
      priority: signal.signalRank + (signal.action === "SELL" ? 2 : 0),
      reason: `${signal.directionName}：${signal.reason}`,
      fundId: signal.fundId,
    });
  }
  for (const row of input.rebalance.rows.filter((item) => item.recommendedAction !== "NONE" && item.recommendedAmount > 0)) {
    if (row.recommendedAction === "BUY" && (cashBlocked || classificationBlocked)) continue;
    actions.push({
      key: `allocation-${row.category}`,
      kind: row.recommendedAction === "BUY" ? "BUY" : "SELL",
      title: `${row.recommendedAction === "BUY" ? "补足" : "降低"} · ${row.category}`,
      amount: row.recommendedAmount,
      priority: 1,
      reason: `当前 ${row.currentPercent.toFixed(1)}%，目标 ${row.targetPercent.toFixed(1)}%，偏离金额约 ¥${Math.abs(row.gapAmount).toLocaleString()}`,
    });
  }
  for (const item of reviewItems.slice(0, 3)) {
    actions.push({ key: `review-${item}`, kind: "REVIEW", title: "补充资产资料", amount: 0, priority: 0, reason: item });
  }
  actions.sort((a, b) => b.priority - a.priority || b.amount - a.amount);

  const gate: InvestmentPlanGate = cashBlocked ? "BLOCKED" : classificationBlocked || hasStaleSignals ? "REVIEW" : "READY";
  const decision = cashBlocked
    ? "先补足家庭现金安全垫，再考虑新增风险资产。"
    : classificationBlocked
      ? "先补齐外部账户底层分类，避免重复计算和错误加仓。"
      : actions.length > 0
        ? "按优先级分批执行，执行后记录实际金额并在下次复盘。"
        : "当前没有需要执行的动作，继续持有并等待新数据。";
  return { gate, decision, guardrails, actions: actions.slice(0, 8), reviewItems, generatedAt };
}
