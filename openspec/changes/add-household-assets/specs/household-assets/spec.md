## ADDED Requirements

### Requirement: Household asset maintenance
The system SHALL let an authenticated user manually maintain current household asset balances by platform and family member.

#### Scenario: Update an account balance
- **WHEN** the user updates an asset balance and as-of date
- **THEN** the household total uses the new balance and an immutable snapshot records that value and date

#### Scenario: Historical curve
- **WHEN** the user views household asset history
- **THEN** prior manual asset values remain visible by month instead of being overwritten

#### Scenario: Successful form submission
- **WHEN** a household member, asset, policy, or premium payment is saved successfully
- **THEN** its modal closes immediately while the page data refreshes in the background

#### Scenario: Month-end reminder
- **WHEN** the current date is within the final five days of the month and an asset has not been updated during that month
- **THEN** the page and navigation show an update reminder

### Requirement: Investment-direction aggregation
The system SHALL include existing investment directions in household totals through explicit monthly value snapshots without copying their holdings or transactions.

#### Scenario: Monthly synchronization
- **WHEN** the user synchronizes investment directions for the current month
- **THEN** each direction's current market value is stored as that month's household snapshot

#### Scenario: Repeat synchronization
- **WHEN** the user synchronizes investment directions again in the same month
- **THEN** the current month's values are updated without creating duplicate monthly points or changing prior months

#### Scenario: Household history
- **WHEN** an investment direction has monthly household snapshots
- **THEN** those monthly values are included in the household historical curve without daily fluctuations

#### Scenario: Member assignment
- **WHEN** an investment direction is assigned to a household member
- **THEN** member-filtered household totals and history include that direction for the assigned member

### Requirement: Household insurance maintenance
The system SHALL let an authenticated user maintain policies by insured family member and record annual premium payments without overwriting prior years.

#### Scenario: Annual premium payment
- **WHEN** the user records a premium for a policy and year
- **THEN** the payment is retained and that year is shown as paid

#### Scenario: Refundable nursing insurance
- **WHEN** a nursing policy has a maturity date and refundable amount
- **THEN** the page displays that future refund separately from current household assets

### Requirement: Household data isolation
The system SHALL restrict household members, assets, policies, and payments to their owning authenticated user.

#### Scenario: Cross-user mutation
- **WHEN** a user attempts to update or delete another user's household record
- **THEN** the operation is rejected without changing data
