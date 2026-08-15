## 1. Data and API

- [x] 1.1 Add household member, asset, insurance policy, and premium payment models
- [x] 1.2 Add the reviewed SQL migration and regenerate Prisma Client
- [x] 1.3 Add authenticated CRUD endpoints with ownership validation
- [x] 1.4 Add manual asset snapshots and backfill existing balances
- [x] 1.5 Add household-member ownership to investment directions
- [x] 1.6 Add monthly investment-direction household snapshots
- [x] 1.7 Add protection-plan grouping and backfill existing policies
- [x] 1.8 Add annual renewal/replacement API support and ownership checks

## 2. User interface

- [x] 2.1 Add the responsive household-assets overview and manual maintenance forms
- [x] 2.2 Add annual premium-payment recording
- [x] 2.3 Add month-end stale-asset reminders to the page and navigation
- [x] 2.4 Close maintenance modals immediately after successful saves
- [x] 2.5 Add the household history curve and monthly investment-direction cards
- [x] 2.6 Add member filtering and investment-direction member selection
- [x] 2.7 Add explicit monthly investment-direction synchronization
- [x] 2.8 Keep member ownership from compressing investment-direction names
- [x] 2.9 Group insurance cards by protection plan
- [x] 2.10 Add annual renewal, product replacement, and expiry reminders
- [x] 2.11 Add prior-term backfill and cumulative premium display
- [x] 2.12 Align protection cards with variable content
- [x] 2.13 Show prior annual policies in a scrollable modal
- [x] 2.14 Copy long-term protection to another family member
- [x] 2.15 Directly copy the latest annual policy to another member through the API
- [x] 2.16 Add member-grouped insurance cards and yearly premium dashboard
- [x] 2.17 Switch member groups to tabs and tolerate short accident-insurance gaps
- [x] 2.18 Ignore resolved historical coverage gaps

## 3. Verification

- [x] 3.1 Add a regression check for month-end reminder logic
- [ ] 3.2 Verify desktop and 375px-wide layouts (browser unavailable; responsive code inspected)
- [x] 3.3 Run Prisma, TypeScript, targeted lint, diff, and CodeGraph checks (`openspec` CLI unavailable locally)
- [x] 3.4 Add regression checks for snapshot history aggregation
- [x] 3.5 Add regression checks for annual policy periods and reminders
- [x] 3.6 Add regression checks for prior-term periods and cumulative premiums
- [x] 3.7 Add regression checks for yearly premium aggregation
