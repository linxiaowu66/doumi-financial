## 1. Data model

- [ ] 1.1 Add dated market-indicator snapshot storage with source and freshness metadata
- [ ] 1.2 Add deduplicated market-news storage with source, tags, publication time, and URL
- [ ] 1.3 Add optional fund benchmark and topic-tag configuration with safe defaults

## 2. Collection

- [ ] 2.1 Implement isolated adapters for the selected market-data sources
- [ ] 2.2 Implement news collection, tagging, deduplication, and per-source failure recording
- [ ] 2.3 Schedule the nightly collector in Asia/Shanghai and resolve the previous available trading date
- [ ] 2.4 Add a freshness/status check for the last successful collection

## 3. Strategy analysis

- [ ] 3.1 Add a read API that returns relevant macro, benchmark, and fund-topic context
- [ ] 3.2 Include context dates, sources, and staleness in the browser AI strategy prompt
- [ ] 3.3 Update the strategy report UI to show source and data-time information

## 4. Verification

- [ ] 4.1 Test partial source failure and stale-snapshot fallback
- [ ] 4.2 Test industry-fund news filtering and deduplication
- [ ] 4.3 Verify a noon report works with context and without context
