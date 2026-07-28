## 1. Data repair

- [x] 1.1 Repair 2026-07-27 daily profit from the previous available snapshot
- [x] 1.2 Verify all six repaired rows and the corrected portfolio total

## 2. Calculation

- [x] 2.1 Use the latest earlier direction snapshot for daily-profit calculation
- [x] 2.2 Use the latest stored daily profit in account summaries
- [x] 2.3 Preserve the stored trading date in chart responses

## 3. Verification

- [x] 3.1 Add a regression check for a trading-day gap
- [x] 3.2 Run TypeScript, targeted lint, diff, OpenSpec, and code graph checks
