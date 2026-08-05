import assert from "node:assert/strict";
import test from "node:test";
import { Decimal } from "@prisma/client/runtime/library";
import {
  calculateDividendAmount,
  parseFundDividendPage,
} from "./fund-dividend";

test("parses per-ten-share dividends and estimates record-date entitlement", () => {
  const html = `<table class="w782 comm cfxq"><tbody><tr>
    <td>2026年</td><td>2026-01-19</td><td>2026-01-19</td>
    <td>每10份派现金0.0500元</td><td>2026-01-21</td>
  </tr></tbody></table>`;
  const [dividend] = parseFundDividendPage(html);

  assert.deepEqual(dividend, {
    recordDate: "2026-01-19",
    exDate: "2026-01-19",
    perShare: "0.005",
    paymentDate: "2026-01-21",
  });

  const base = { amount: new Decimal(0), price: new Decimal(0), fee: new Decimal(0) };
  const amount = calculateDividendAmount(
    [
      { ...base, type: "BUY", shares: new Decimal(1000), date: new Date("2026-01-01T00:00:00+08:00"), dividendReinvest: false },
      { ...base, type: "SELL", shares: new Decimal(-200), date: new Date("2026-01-10T00:00:00+08:00"), dividendReinvest: false },
      { ...base, type: "SELL", shares: new Decimal(-800), date: new Date("2026-01-20T00:00:00+08:00"), dividendReinvest: false },
    ],
    dividend.recordDate,
    dividend.perShare,
  );

  assert.equal(amount.toString(), "4");
});
