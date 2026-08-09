## Why

Family money is distributed across fund, cash, brokerage, pension, and insurance products that are not represented in one manually maintained view.

## What Changes

- Add household members and manually maintained asset accounts.
- Preserve every manual balance update as a historical snapshot.
- Add insurance policies, annual premium payments, and refundable maturity amounts.
- Add a household-assets page with current totals, historical curves, and maintenance actions.
- Include existing investment directions as a monthly synchronized household asset source.
- Assign investment directions to household members for filtered totals and history.
- Show a reminder during the last five days of a month when an asset has not been updated that month.

## Capabilities

### New Capabilities

- `household-assets`: Maintain household assets, insured members, policies, and annual premium payments.

### Modified Capabilities

- None.

## Impact

- Prisma schema and migration.
- Household-assets API and protected page.
- Investment-direction API, form, list, and monthly household snapshots.
- Main navigation reminder.
