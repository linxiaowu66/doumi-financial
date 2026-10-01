## MODIFIED Requirements

### Requirement: Household asset maintenance
The system SHALL let an authenticated user manually maintain household asset balances by platform, family member, and calendar month.

#### Scenario: Update an account balance
- **WHEN** the user saves an asset balance for a selected month
- **THEN** that month stores the balance, the household total uses the latest month, and saving the same month again updates that month instead of adding another row

#### Scenario: Historical records
- **WHEN** the user edits a manual asset
- **THEN** every saved month and balance is listed, and choosing a month loads that balance for correction

#### Scenario: Historical curve
- **WHEN** the user views household asset history
- **THEN** manual balances stay visible by their saved month instead of the day the form was submitted

#### Scenario: Successful form submission
- **WHEN** a household member, asset, policy, or premium payment is saved successfully
- **THEN** its modal closes immediately while the page data refreshes in the background

#### Scenario: Month-end reminder
- **WHEN** the current date is within the final five days of the month and an asset has not been updated during that month
- **THEN** the page and navigation show an update reminder

### Requirement: Investment-direction aggregation
The system SHALL include existing investment directions in household totals through explicit monthly value snapshots without copying their holdings or transactions.

#### Scenario: Monthly synchronization
- **WHEN** the user synchronizes investment directions and chooses a month
- **THEN** each direction's current market value is stored on that chosen month, and the default month is the latest fund net-value month rather than the day of the click

#### Scenario: Repeat synchronization
- **WHEN** the user synchronizes investment directions again for a month that already has a snapshot
- **THEN** that month's values are updated without creating duplicate monthly points or changing other months

#### Scenario: Move a snapshot month
- **WHEN** the user assigns an existing direction snapshot to another month that is empty
- **THEN** the stored value moves to that month and the previous month no longer contains it

#### Scenario: Household history
- **WHEN** an investment direction has monthly household snapshots
- **THEN** the historical curve uses the snapshot month even if the row was saved on a later calendar day
