import assert from "node:assert/strict";
import test from "node:test";
import { backtestDataGrade, runPortfolioBacktest, runPortfolioBacktestReport } from "./portfolio-backtest";

function history(days: number, drift: number) {
  return Array.from({ length: days }, (_, index) => ({
    date: new Date(Date.UTC(2020, 0, 1 + index)).toISOString().slice(0, 10),
    value: 1 + index * drift,
  }));
}

test("回测数据等级会把不足一年、三年和五年的样本区分开", () => {
  assert.equal(backtestDataGrade(125), "INSUFFICIENT");
  assert.equal(backtestDataGrade(252), "RESEARCH");
  assert.equal(backtestDataGrade(756), "RECOMMENDED");
  assert.equal(backtestDataGrade(1260), "ROBUST");
});

test("组合回测报告包含盲测、费率压力和再平衡敏感性", () => {
  const funds = [
    { id: 1, name: "权益样本", targetPercent: 60, buyFeePercent: 0.15, sellFeePercent: 0.5, history: history(1300, 0.0002) },
    { id: 2, name: "固收样本", targetPercent: 40, buyFeePercent: 0.1, sellFeePercent: 0.2, history: history(1300, 0.00005) },
  ];
  const report = runPortfolioBacktestReport(funds);
  assert.equal(report.enoughData, true);
  assert.equal(report.dataGrade, "ROBUST");
  assert.equal(report.robustness.feeStress.length, 3);
  assert.equal(report.robustness.rebalanceSensitivity.length, 2);
  assert.equal(report.robustness.walkForward.length, 3);
  assert.equal(runPortfolioBacktest(funds, { rebalanceFrequency: "QUARTERLY" }).rebalanceFrequency, "QUARTERLY");
});

test("历史不足时不补造数据", () => {
  const result = runPortfolioBacktest([{ id: 1, name: "短样本", targetPercent: 100, buyFeePercent: 0, sellFeePercent: 0, history: history(80, 0.001) }]);
  assert.equal(result.enoughData, false);
  assert.equal(result.observations, 80);
  assert.equal(result.dataGrade, "INSUFFICIENT");
});
