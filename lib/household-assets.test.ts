import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMonthlyHouseholdHistory,
  cumulativeInsurancePremium,
  hasAnnualPolicyGap,
  insurancePremiumsByYear,
  isAnnualPolicyRenewalDue,
  isHouseholdAssetUpdateDue,
  nextAnnualPolicyPeriod,
  previousAnnualPolicyPeriod,
} from "./household-assets";
import { Decimal } from "@prisma/client/runtime/library";
import { calculateDirectionMarketValue } from "./fund-daily-profit";

test("reminds only near month end when an asset is stale", () => {
  const stale = [new Date(2026, 0, 31)];
  const current = [new Date(2026, 1, 10)];

  assert.equal(isHouseholdAssetUpdateDue(stale, new Date(2026, 1, 23)), false);
  assert.equal(isHouseholdAssetUpdateDue(stale, new Date(2026, 1, 24)), true);
  assert.equal(isHouseholdAssetUpdateDue(current, new Date(2026, 1, 28)), false);
  assert.equal(isHouseholdAssetUpdateDue([], new Date(2026, 1, 28)), false);
});

test("keeps prior manual balances and combines direction values by month", () => {
  const history = buildMonthlyHouseholdHistory(
    [
      { sourceId: 1, category: "YUEBAO", value: 100, date: new Date(2026, 0, 31) },
      { sourceId: 1, category: "YUEBAO", value: 120, date: new Date(2026, 1, 28) },
    ],
    [
      { sourceId: 9, value: 200, date: new Date(2026, 0, 30) },
      { sourceId: 9, value: 230, date: new Date(2026, 1, 27) },
    ],
  );

  assert.deepEqual(history.map(({ month, total, YUEBAO, directions }) => ({ month, total, YUEBAO, directions })), [
    { month: "2026-01", total: 300, YUEBAO: 100, directions: 200 },
    { month: "2026-02", total: 350, YUEBAO: 120, directions: 230 },
  ]);
});

test("calculates the current direction market value from confirmed holdings", () => {
  const value = calculateDirectionMarketValue([{
    latestNetWorth: new Decimal(2),
    transactions: [
      { type: "BUY", amount: new Decimal(100), shares: new Decimal(50), price: new Decimal(2), fee: new Decimal(0), dividendReinvest: false },
      { type: "SELL", amount: new Decimal(40), shares: new Decimal(20), price: new Decimal(2), fee: new Decimal(0), dividendReinvest: false },
    ],
  }]);

  assert.equal(value, 60);
});

test("advances annual coverage and reminds within 30 days", () => {
  const period = nextAnnualPolicyPeriod("2026-08-31T00:00:00+08:00");
  assert.equal(period.startDate.getFullYear(), 2026);
  assert.equal(period.startDate.getMonth(), 8);
  assert.equal(period.startDate.getDate(), 1);
  assert.equal(period.maturityDate.getFullYear(), 2027);
  assert.equal(period.maturityDate.getMonth(), 7);
  assert.equal(period.maturityDate.getDate(), 31);
  assert.equal(isAnnualPolicyRenewalDue("2026-08-31", new Date(2026, 7, 1)), true);
  assert.equal(isAnnualPolicyRenewalDue("2026-10-01", new Date(2026, 7, 1)), false);
  assert.equal(hasAnnualPolicyGap([
    { startDate: "2025-09-01", maturityDate: "2026-08-31" },
    { startDate: "2026-09-02", maturityDate: "2027-09-01" },
  ]), true);
  assert.equal(hasAnnualPolicyGap([
    { startDate: "2025-09-01", maturityDate: "2026-08-31" },
    { startDate: "2026-09-01", maturityDate: "2027-08-31" },
  ]), false);
  assert.equal(hasAnnualPolicyGap([
    { startDate: "2025-09-01", maturityDate: "2026-08-31" },
    { startDate: "2026-09-08", maturityDate: "2027-09-07" },
  ], 7), false);
  assert.equal(hasAnnualPolicyGap([
    { startDate: "2025-09-01", maturityDate: "2026-08-31" },
    { startDate: "2026-09-09", maturityDate: "2027-09-08" },
  ], 7), true);
  assert.equal(hasAnnualPolicyGap([
    { startDate: "2024-09-01", maturityDate: "2025-08-31" },
    { startDate: "2025-09-09", maturityDate: "2026-09-08" },
  ], 7, new Date("2026-01-01")), false);
  assert.equal(hasAnnualPolicyGap([
    { startDate: "2025-09-01", maturityDate: "2026-08-31" },
    { startDate: "2026-09-09", maturityDate: "2027-09-08" },
  ], 7, new Date("2026-09-01")), true);
});

test("backfills the preceding annual term and totals actual premiums", () => {
  const period = previousAnnualPolicyPeriod("2025-09-01", "2026-08-31");
  assert.equal(period.startDate.getFullYear(), 2024);
  assert.equal(period.maturityDate.getFullYear(), 2025);
  assert.equal(cumulativeInsurancePremium("ANNUAL", [
    { annualPremium: "399.00", premiumPayments: [] },
    { annualPremium: "429.00", premiumPayments: [] },
  ]), 828);
  assert.equal(cumulativeInsurancePremium("LONG_TERM", [
    {
      annualPremium: "5000.00",
      startDate: "2019-01-01",
      premiumPayments: [{ year: 2024, amount: "4800.00" }, { year: 2026, amount: "5100.00" }],
    },
  ], new Date("2026-08-15")), 39900);
  assert.deepEqual(insurancePremiumsByYear("LONG_TERM", [{
    annualPremium: 1000,
    startDate: "2024-01-01",
    premiumPayments: [{ year: 2025, amount: 1200 }],
  }], new Date("2026-08-15")), [
    { year: 2024, amount: 1000 },
    { year: 2025, amount: 1200 },
    { year: 2026, amount: 1000 },
  ]);
});
