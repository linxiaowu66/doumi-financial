## MODIFIED Requirements

### Requirement: Household asset maintenance
The system SHALL let an authenticated user manually maintain household asset balances by platform, family member, and calendar month. The monthly history chart SHALL label its value axis in wan and keep the first and last month labels inside the plot.

#### Scenario: Update an account balance
- **WHEN** the user saves an asset balance for a selected month
- **THEN** that month stores the balance, the household total uses the latest month, and saving the same month again updates that month instead of adding another row

#### Scenario: Historical records
- **WHEN** the user edits a manual asset
- **THEN** every saved month and balance is listed, and choosing a month loads that balance for correction

#### Scenario: Historical curve
- **WHEN** the user views household asset history
- **THEN** manual balances stay visible by their saved month instead of the day the form was submitted

#### Scenario: Compact value axis
- **WHEN** the monthly chart draws a tick at 500000 or 1000000
- **THEN** the tick reads 50w or 100w, while the hover amount stays in yuan

#### Scenario: Latest month label
- **WHEN** the chart includes a month such as 2026-09 at the right edge
- **THEN** that month label ends at its tick and remains inside the chart on both desktop and a 375px-wide screen

#### Scenario: Successful form submission
- **WHEN** a household member, asset, policy, or premium payment is saved successfully
- **THEN** its modal closes immediately while the page data refreshes in the background

#### Scenario: Month-end reminder
- **WHEN** the current date is within the final five days of the month and an asset has not been updated during that month
- **THEN** the page and navigation show an update reminder
