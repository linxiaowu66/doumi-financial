import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMonthlyHouseholdHistory,
  isHouseholdAssetUpdateDue,
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
