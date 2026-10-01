## Why

Two investment directions have been fully sold. A few leftover fund shares still add up to 0.06 and 0.08 yuan, and the household page shows those residuals as direction cards and includes them in the total.

## What Changes

- Hide an investment direction from the household asset page when its current market value and latest snapshot are both below 1 yuan.
- Leave a direction in the monthly chart when an earlier snapshot was at least 1 yuan, so a real balance still drops off after liquidation.
- Skip snapshot sync for a direction that has never had a household value of at least 1 yuan and is still below that now.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `household-assets`: Liquidated directions with only residual cents are omitted from household cards, totals, and new snapshots.

## Impact

- Household asset API response and investment-direction sync.
- Existing residual snapshots stay stored and can reappear if the direction's market value reaches 1 yuan again.
