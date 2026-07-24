## ADDED Requirements

### Requirement: Nightly market context collection
The system SHALL collect the previous available trading day's configured market indicators and relevant news during the nightly job window.

#### Scenario: Successful nightly collection
- **WHEN** the scheduled job runs and a configured source responds with valid data
- **THEN** the system stores normalized indicators or news with source, as-of date, and collection timestamp

#### Scenario: Partial source failure
- **WHEN** one configured source fails during collection
- **THEN** the system records the failure and preserves successful data from other sources and the last successful data for the failed source

### Requirement: Relevant news filtering
The system SHALL classify news into macro, benchmark, and fund-topic tags and SHALL return only items relevant to the requested portfolio context.

#### Scenario: Industry fund context
- **WHEN** a portfolio contains a fund tagged with an industry topic
- **THEN** the context includes matching industry news in addition to applicable macro news

### Requirement: Source freshness
The system SHALL expose both the source as-of date and the collection timestamp for every market-context response.

#### Scenario: Stale context
- **WHEN** no newer successful snapshot exists
- **THEN** the response identifies the snapshot as stale instead of presenting it as real-time data
