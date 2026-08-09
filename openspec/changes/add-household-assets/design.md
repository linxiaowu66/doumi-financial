## Context

External providers do not offer a suitable self-service account API, so manual accounts retain a current balance plus immutable update snapshots. Insurance payments require separate yearly records so updating a policy does not erase payment history. Existing investment directions remain the source of truth for holdings, while household assets capture only an explicit month-end value snapshot.

## Decisions

- Store current asset balance and its as-of date, and append a snapshot whenever either changes.
- Aggregate manual snapshots and explicitly synchronized investment-direction snapshots by month for the household curve.
- Synchronize each investment direction at most once per month; repeating the action updates that month without changing prior months.
- Allow a nullable household-member assignment on each investment direction.
- Keep protection coverage and refundable maturity value separate from liquid/current assets.
- Treat the final five calendar days as the month-end reminder window.
- Scope all household data to the authenticated user.

## Non-Goals

- Provider API synchronization.
- Transaction-level household accounting outside existing investment directions.
- Push, email, or system notifications.
- Daily investment-direction synchronization in household assets.
