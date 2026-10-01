## MODIFIED Requirements

### Requirement: Household asset maintenance
The system SHALL let an authenticated user manually maintain household asset balances by platform, family member, and calendar month. Account profile fields and monthly balances SHALL be edited separately.

#### Scenario: Update an account balance
- **WHEN** the user saves an asset balance for a selected month in the history dialog
- **THEN** that month stores the balance, the household total uses the latest month, and the history dialog stays open

#### Scenario: Historical records
- **WHEN** the user opens 月份记录 on a manual asset card
- **THEN** a separate dialog lists every saved month and balance, and the account dialog is not open

#### Scenario: Add a month
- **WHEN** the user adds a month from the history dialog
- **THEN** a month-and-balance form appears in that dialog, and choosing a month that already exists is rejected

#### Scenario: Update account profile
- **WHEN** the user opens 编辑账户 and saves the name, platform, owner, or remark
- **THEN** those fields change, the dialog contains no month list, and existing monthly balances stay as they were

#### Scenario: Historical curve
- **WHEN** the user views household asset history
- **THEN** manual balances stay visible by their saved month instead of the day the form was submitted

#### Scenario: Successful form submission
- **WHEN** a household member, new asset, policy, or premium payment is saved successfully
- **THEN** its modal closes immediately while the page data refreshes in the background

#### Scenario: Month-end reminder
- **WHEN** the current date is within the final five days of the month and an asset has not been updated during that month
- **THEN** the page and navigation show an update reminder
