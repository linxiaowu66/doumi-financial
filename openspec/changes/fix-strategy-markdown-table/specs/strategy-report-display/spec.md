## ADDED Requirements

### Requirement: Styled strategy report tables
The dashboard SHALL render AI strategy Markdown tables using the shared Markdown report styles.

#### Scenario: Desktop strategy report
- **WHEN** a strategy report contains a Markdown table on a desktop viewport
- **THEN** the table has clear cell boundaries and readable column layout

#### Scenario: Narrow strategy report
- **WHEN** a strategy report table is wider than a narrow viewport
- **THEN** the report provides intentional horizontal scrolling instead of overflowing the modal
