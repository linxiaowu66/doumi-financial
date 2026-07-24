## Context

The application already stores fund net-worth history and generates a browser-side AI strategy report from portfolio data and rule alerts. The report needs dated external context, while the user's server may not reliably reach every AI provider. Collection and AI generation should therefore remain separate: the server stores market context overnight; the browser sends that stored context to the configured AI provider at noon.

## Goals / Non-Goals

**Goals:**

- Make the noon analysis fast and reproducible using the previous trading day's data.
- Cover macro, broad-index, and fund-specific sector context.
- Preserve source, publication, and collection timestamps.
- Degrade safely when one source fails.

**Non-Goals:**

- Automatic trading or broker integration.
- Real-time intraday signals.
- Scraping full article bodies.
- Letting the AI invent missing market data.

## Decisions

- Use a nightly collector with a retry and last-successful-run record. This is preferred over noon-only fetching because it avoids latency and makes reports reproducible.
- Store normalized indicators and short news metadata rather than raw pages. This reduces storage, legal, and prompt-size concerns.
- Reuse the existing fund category initially, then add explicit benchmark/topic tags where category inference is insufficient. A full security master is deferred.
- Filter news by macro tags, benchmark tags, and fund topic tags before sending it to the model. Sending every fund every headline would add noise and cost.
- Keep the existing browser AI provider abstraction. The market-context API returns data; it does not need to know which AI provider is selected.

## Risks / Trade-offs

- [External source outage] → Keep the last successful snapshot and mark its age; do not fail the entire report.
- [Unofficial API format changes] → Isolate each source adapter and validate normalized output.
- [Irrelevant headlines] → Use explicit tags, source timestamps, and a small per-fund headline limit.
- [Stale data mistaken for live data] → Include `asOf` and `collectedAt` in both API output and prompt.
- [Timezone/trading-calendar mismatch] → Run in Asia/Shanghai, use the previous available trading date, and record the resolved date.

## Migration Plan

1. Add tables and optional fund benchmark/topic fields with defaults.
2. Deploy the collector in disabled or dry-run mode and verify source freshness.
3. Enable nightly collection and verify one complete snapshot.
4. Add the context to the noon AI report.
5. Roll back by disabling context injection; stored snapshots can remain for audit.

## Open Questions

- Which market-data and news providers are acceptable for production use and licensing?
- Should provider API keys be server-side environment secrets or user-configured settings?
- Which initial benchmark/tag mappings cover the current portfolio?
