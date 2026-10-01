## MODIFIED Requirements

### Requirement: Investment-direction aggregation
The system SHALL include existing investment directions in household totals through explicit monthly value snapshots without copying their holdings or transactions. A direction whose current market value and latest snapshot are both below 1 yuan SHALL be omitted from household cards, totals, reminders, and the sync list.

#### Scenario: Monthly synchronization
- **WHEN** the user synchronizes investment directions and chooses a month
- **THEN** each still-held direction's current market value is stored on that chosen month, and the default month is the latest fund net-value month rather than the day of the click

#### Scenario: Repeat synchronization
- **WHEN** the user synchronizes investment directions again for a month that already has a snapshot
- **THEN** that month's values are updated without creating duplicate monthly points or changing other months

#### Scenario: Move a snapshot month
- **WHEN** the user assigns an existing direction snapshot to another month that is empty
- **THEN** the stored value moves to that month and the previous month no longer contains it

#### Scenario: Liquidated residual value
- **WHEN** a direction's current market value and every saved snapshot are below 1 yuan
- **THEN** the household page does not show that direction, and synchronizing does not write another snapshot for it

#### Scenario: Liquidation after a real balance
- **WHEN** a direction previously had a snapshot of at least 1 yuan and its latest value is now below 1 yuan
- **THEN** the current card is hidden, while earlier monthly totals still include the real balance
