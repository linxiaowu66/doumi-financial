## Why

Fund dividends currently require manual discovery and entry, so a distribution can be missed until the user checks each holding externally.

## What Changes

- Configure each fund for cash dividends or dividend reinvestment, defaulting to cash.
- Let the daily cron detect dividends paid on the previous Shanghai calendar day for funds that are still held.
- Create idempotent pending dividend records with an estimated amount and require user confirmation before recording income or shares.

## Capabilities

### New Capabilities

- `automatic-fund-dividends`: Detect and confirm fund distributions without automatic financial posting.

### Modified Capabilities

- None.

## Impact

- Fund and pending-transaction data models and migration.
- Fund create/edit APIs and responsive fund configuration UI.
- Daily cron processing and the fund-detail pending confirmation flow.
