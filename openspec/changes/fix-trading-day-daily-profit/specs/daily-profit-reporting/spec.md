## MODIFIED Requirements

### Requirement: Trading-day daily profit
The system SHALL calculate a direction's daily profit from the latest available earlier direction snapshot.

#### Scenario: Trading day after a weekend
- **WHEN** a Monday snapshot is calculated and the latest earlier snapshot is Friday
- **THEN** daily profit equals Monday cumulative profit minus Friday cumulative profit

#### Scenario: Account summary
- **WHEN** an account summary displays yesterday profit
- **THEN** it uses the latest stored direction daily-profit value

### Requirement: Trading-date display
The system SHALL display a direction daily-profit record using its stored trading date.

#### Scenario: Profit chart
- **WHEN** a stored record is dated on a trading day
- **THEN** the chart response returns that same date without a calendar-day offset
