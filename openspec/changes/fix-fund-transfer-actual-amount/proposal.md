## Why

Moving the last fund out of an investment direction leaves its cached actual amount unchanged, while the detail page correctly shows no current cost. The fund update changes ownership without recalculating either affected direction, and the daily job cannot repair an empty direction.
The cached calculation also subtracts sale proceeds instead of releasing the sold units' cost, so a profitable closed position produces a negative actual amount instead of zero.

## What Changes

- Recalculate both the source and destination actual amounts after moving a fund.
- Recalculate the source actual amount after deleting a fund.
- Include empty directions in the daily reconciliation so existing stale amounts self-heal.
- Define actual amount consistently as current holding cost.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `investment-direction-actual-amount`: Keep cached actual amounts synchronized when funds move or are deleted.

## Impact

- Shared actual-amount calculation, fund update and delete APIs, daily reconciliation, and list tooltip copy.
