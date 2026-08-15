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
The system SHALL let an authenticated user group actual policies into annual or long-term protection plans by insured family member without overwriting prior policy terms or payments.

#### Scenario: Default protection mode
- **WHEN** the user creates an accident or medical protection plan
- **THEN** the form defaults to annual coverage while allowing the user to choose long-term coverage

#### Scenario: Renew an annual policy
- **WHEN** the user renews an annual plan
- **THEN** a new policy form retains the plan, insurer, product, insured member, insurance type, and coverage amount; advances the coverage period; and clears policy number and premium

#### Scenario: Replace an annual product
- **WHEN** the user replaces the product for an annual plan
- **THEN** a new policy form retains only the plan, insured member, insurance type, and next coverage period

#### Scenario: Copy protection to another member
- **WHEN** the user copies a long-term protection plan for another family member
- **THEN** a new independent plan reuses the product details without payment history and requires the user to choose the insured member and confirm dates and premium

#### Scenario: Directly copy an annual policy
- **WHEN** the user selects another family member and directly copies an annual protection plan
- **THEN** the API creates a separate plan with every annual policy term and its premium history while omitting policy numbers

#### Scenario: Complete a previously copied annual plan
- **WHEN** the target member already has the matching latest annual policy
- **THEN** repeating the copy adds only missing historical terms instead of creating a duplicate protection plan

#### Scenario: Annual policy history
- **WHEN** multiple annual policies belong to one protection plan
- **THEN** the latest term remains visible and prior terms with their own premiums remain available in a scrollable history modal without extending the page card

#### Scenario: Backfill a prior annual policy
- **WHEN** the user backfills an earlier term for an annual protection plan
- **THEN** the form retains the earliest term's product details, proposes the preceding coverage period, and lets the user enter the actual policy number and premium

#### Scenario: Cumulative premiums
- **WHEN** a protection plan has annual terms or recorded long-term premium payments
- **THEN** the page sums annual terms directly, and for a long-term policy estimates each elapsed annual installment from its effective date while using any recorded payment as that year's actual override

#### Scenario: Premium dashboard
- **WHEN** the user views household insurance
- **THEN** the page shows total and current-year premiums, an annual premium chart, and member-level totals using the same actual-or-estimated calculation

#### Scenario: Group protection by member
- **WHEN** multiple family members have protection plans
- **THEN** each member has a separate tab containing their premium summary and protection plans

#### Scenario: Aligned protection cards
- **WHEN** annual and long-term protection cards with different detail rows share a desktop row
- **THEN** their summary, policy, and bottom action regions remain aligned while mobile uses a single-column layout

#### Scenario: Annual renewal reminder
- **WHEN** the latest annual policy expires within 30 days or has expired
- **THEN** the page prompts the user to renew or replace the product

#### Scenario: Coverage gap reminder
- **WHEN** consecutive annual policy terms have uncovered days between them
- **THEN** the page identifies only current or upcoming coverage gaps, ignores resolved historical gaps, and tolerates up to seven uncovered days for accident insurance

#### Scenario: Annual premium payment
- **WHEN** the user records a premium for a long-term policy and year
- **THEN** the payment is retained and that year is shown as paid

#### Scenario: Refundable nursing insurance
- **WHEN** a nursing policy has a maturity date and refundable amount
- **THEN** the page displays that future refund separately from current household assets

### Requirement: Household data isolation
The system SHALL restrict household members, assets, policies, and payments to their owning authenticated user.

#### Scenario: Cross-user mutation
- **WHEN** a user attempts to update or delete another user's household record
- **THEN** the operation is rejected without changing data
