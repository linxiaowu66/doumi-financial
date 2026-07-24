## Why

The daily AI strategy report currently has portfolio and rule-alert data but no stable market context. Fetching news and indicators only at analysis time is slower, less reproducible, and vulnerable to external API failures. A nightly snapshot lets the noon report use the previous trading day's fund, index, macro, and sector information.

## What Changes

- Add a nightly market-context collection job for previous-day market indicators and news.
- Store timestamped, source-attributed market snapshots and deduplicated news items.
- Associate funds with benchmark and sector/topic tags so broad-index and industry funds receive relevant context.
- Include the latest successful market context in the browser-generated AI strategy report.
- Display data dates and sources in the report and tolerate missing or stale sources.

## Capabilities

### New Capabilities

- `offline-market-context`: Collect, normalize, store, and retrieve dated market indicators and relevant news.
- `market-aware-strategy-analysis`: Use stored market context with portfolio data and rule alerts when generating AI strategy reports.

### Modified Capabilities

- None.

## Impact

- Prisma schema and migrations for market snapshots, news, and fund market tags.
- A scheduled server-side collector and a read API for the noon analysis flow.
- Dashboard AI strategy analysis prompt and report display.
- External data-source configuration, retry behavior, and source attribution.
