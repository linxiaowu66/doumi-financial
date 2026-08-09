## MODIFIED Requirements

### Requirement: Cached actual amount synchronization
The system SHALL represent an investment direction's actual amount as the current holding cost and recalculate it whenever fund membership changes.

#### Scenario: Fund transfer
- **WHEN** a fund moves from one investment direction to another
- **THEN** both the source and destination actual amounts reflect their current funds

#### Scenario: Last fund removed
- **WHEN** the last fund is moved or deleted from an investment direction
- **THEN** that direction's actual amount is zero

#### Scenario: Existing stale empty direction
- **WHEN** daily actual-amount reconciliation runs for an empty direction
- **THEN** its cached actual amount is corrected to zero

#### Scenario: Profitable closed position
- **WHEN** all units of a fund have been sold for more than their purchase cost
- **THEN** the direction's actual amount excludes that closed position and does not become negative

#### Scenario: Zero expected amount
- **WHEN** an investment direction's expected amount is zero
- **THEN** its detail page displays zero investment progress instead of an invalid number
