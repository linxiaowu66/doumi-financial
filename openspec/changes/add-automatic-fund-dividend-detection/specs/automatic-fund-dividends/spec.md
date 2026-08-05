## ADDED Requirements

### Requirement: Fund dividend preference
The system SHALL store a dividend preference for each fund and SHALL default new and existing funds to cash dividends.

#### Scenario: Configure dividend reinvestment
- **WHEN** a user selects dividend reinvestment while creating or editing a fund
- **THEN** subsequent detected dividends use the reinvestment confirmation flow

#### Scenario: Responsive dividend options
- **WHEN** the fund modal is displayed on desktop or a 375px-wide screen
- **THEN** cash dividends and dividend reinvestment remain on one full-width option row

### Requirement: Daily dividend detection
The system SHALL inspect the previous Asia/Shanghai calendar day's payment date for each currently held fund when the daily cron runs.

#### Scenario: Held fund has a paid dividend
- **WHEN** a fund has positive current shares and a public dividend record paid yesterday
- **THEN** the system creates one pending dividend with the estimated entitlement based on record-date shares

#### Scenario: Cron retries
- **WHEN** the daily cron detects a dividend it has already stored
- **THEN** no duplicate pending dividend is created

#### Scenario: Cleared fund
- **WHEN** a fund has no positive current holding
- **THEN** the system does not request or create a dividend record for it

### Requirement: User-confirmed dividend posting
The system SHALL NOT post a detected dividend to financial results until the user confirms its actual cash amount or reinvested shares.

#### Scenario: Confirm cash dividend
- **WHEN** the user confirms a pending cash dividend
- **THEN** the system atomically creates a cash dividend transaction and marks the pending item confirmed

#### Scenario: Confirm reinvested dividend
- **WHEN** the user supplies the actual reinvested shares and confirms the pending dividend
- **THEN** the system atomically creates a reinvested dividend transaction and marks the pending item confirmed
