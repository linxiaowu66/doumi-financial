## Why

Direction daily profit snapshots are stored on trading dates, but the calculation still looks up the previous calendar date. After weekends or holidays, the missing prior-day snapshot causes cumulative profit to be recorded as one-day profit and corrupts dashboard daily, monthly, and yearly totals.

## What Changes

- Compare each direction snapshot with the latest earlier snapshot instead of the previous calendar date.
- Read the latest stored direction daily profit for account summary cards.
- Display stored trading dates without subtracting one day.
- Repair the corrupted 2026-07-27 direction daily-profit rows.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `daily-profit-reporting`: Keep direction daily profit and displayed dates correct across weekends and holidays.

## Impact

- Direction daily-profit calculation and account summary APIs.
- Direction profit-chart date labels.
- Six production `DirectionDailyProfit` rows dated 2026-07-27.
