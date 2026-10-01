## Why

The household monthly chart prints full yuan amounts on the Y axis and clips the latest month label at the right edge.

## What Changes

- Show Y-axis ticks in wan, such as 50w and 100w. Tooltip amounts stay in yuan.
- Keep the first month label starting at its tick and the last month label ending at its tick, so 2026-09 stays inside the chart.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `household-assets`: The monthly history chart uses compact wan ticks and keeps both end month labels inside the plot.

## Impact

- Household asset monthly trend chart only.
