## Why

Household snapshots are filed by the calendar day the user clicks save. On the first day of a month the latest fund net value still belongs to the previous month's last trading day, so September's closing value is stored as October. Manual asset forms have the same day-based date and hide every past balance except the combined chart.

## What Changes

- Save investment-direction snapshots into a month the user chooses. The default month follows the latest fund net-value date, not the day they click sync.
- Reassign existing snapshots that were saved on the first China-calendar day of a month back to the previous month, keeping the later value when two rows land on the same month.
- Record manual asset balances by month, show every month inside the edit dialog, and update that month instead of appending another dated row.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `household-assets`: Monthly investment snapshots and manual balances follow the selected month, and each manual account exposes its month-by-month history.

## Impact

- Household asset page, household asset API, and monthly history aggregation.
- `HouseholdAssetHistory` gains one balance per account per month.
- Existing direction snapshots saved on the 1st are moved to the previous month.
