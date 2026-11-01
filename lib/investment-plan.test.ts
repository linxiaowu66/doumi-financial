import assert from "node:assert/strict";
import test from "node:test";
import { buildInvestmentPlan } from "./investment-plan";

const base = {
  household: { combinedValue: 100000, unclassifiedExternalValue: 0, accountsNeedingReview: [] },
  rebalance: { cashReserveGap: 0, rows: [] },
  signals: [],
};

test("blocks buys when the cash reserve is short", () => {
    const plan = buildInvestmentPlan({
      ...base,
      rebalance: { cashReserveGap: 5000, rows: [] },
      signals: [{ fundId: 1, fundName: "基金", directionName: "长期", action: "BUY", actionAmount: 1000, signal: "分批买入", signalRank: 1, reason: "缺口", dataFresh: true, dataPoints: 30 }],
    });
    assert.equal(plan.gate, "BLOCKED");
    assert.equal(plan.actions.length, 0);
});

test("keeps sell actions available while review is required", () => {
    const plan = buildInvestmentPlan({
      ...base,
      household: { ...base.household, unclassifiedExternalValue: 1000, accountsNeedingReview: [{ name: "策略账户", value: 1000, reason: "缺少底层持仓" }] },
      signals: [{ fundId: 1, fundName: "基金", directionName: "趋势", action: "SELL", actionAmount: 1000, signal: "分批卖出", signalRank: 4, reason: "趋势破坏", dataFresh: true, dataPoints: 30 }],
    });
    assert.equal(plan.gate, "REVIEW");
    assert.equal(plan.actions[0]?.kind, "SELL");
});
