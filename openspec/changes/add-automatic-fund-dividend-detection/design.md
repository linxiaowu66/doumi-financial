## Context

The existing daily cron already updates fund data, and pending transactions already provide a user-review queue. Public dividend pages expose record date, per-share distribution, and payment date, but not the user's final cash amount or reinvested shares.

## Decisions

- Reuse the existing daily cron instead of adding a second scheduler.
- Treat the public payment date as the arrival date and inspect the previous calendar day in Asia/Shanghai.
- Scan only fund directions with a positive current holding.
- Estimate entitlement from ledger shares on the record date.
- Store detected items as pending transactions and use a unique source key for retry-safe insertion.
- Confirm a pending dividend through the existing dividend transaction modal; formal transaction creation and pending completion are atomic.

## Risks

- The public HTML layout is not a supported API. Parsing is isolated and covered by a small regression test.
- Account-provider rounding can differ from estimates, so detected dividends are never posted automatically.
