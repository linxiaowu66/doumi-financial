## ADDED Requirements

### Requirement: Market-aware strategy report
The AI strategy analysis SHALL include stored market context alongside portfolio holdings and rule alerts when generating a report.

#### Scenario: Noon report with context
- **WHEN** the user runs strategy analysis and a market snapshot is available
- **THEN** the report references the snapshot date and uses relevant macro, benchmark, and fund-topic context

#### Scenario: No market context
- **WHEN** the user runs strategy analysis and no valid market snapshot is available
- **THEN** the report still analyzes portfolio and rule data and explicitly states that external market context is unavailable

### Requirement: No fabricated market facts
The AI prompt SHALL instruct the model to use only supplied market context and to label uncertainty or missing data.

#### Scenario: Missing indicator
- **WHEN** an expected indicator is missing from the supplied context
- **THEN** the report does not invent a value and identifies the missing indicator
