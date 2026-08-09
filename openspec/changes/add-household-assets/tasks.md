## 1. Data and API

- [x] 1.1 Add household member, asset, insurance policy, and premium payment models
- [x] 1.2 Add the reviewed SQL migration and regenerate Prisma Client
- [x] 1.3 Add authenticated CRUD endpoints with ownership validation
- [x] 1.4 Add manual asset snapshots and backfill existing balances
- [x] 1.5 Add household-member ownership to investment directions
- [x] 1.6 Add monthly investment-direction household snapshots

## 2. User interface

- [x] 2.1 Add the responsive household-assets overview and manual maintenance forms
- [x] 2.2 Add annual premium-payment recording
- [x] 2.3 Add month-end stale-asset reminders to the page and navigation
- [x] 2.4 Close maintenance modals immediately after successful saves
- [x] 2.5 Add the household history curve and monthly investment-direction cards
- [x] 2.6 Add member filtering and investment-direction member selection
- [x] 2.7 Add explicit monthly investment-direction synchronization
- [x] 2.8 Keep member ownership from compressing investment-direction names

## 3. Verification

- [x] 3.1 Add a regression check for month-end reminder logic
- [ ] 3.2 Verify desktop and 375px-wide layouts (browser unavailable; responsive code inspected)
- [x] 3.3 Run Prisma, TypeScript, targeted lint, diff, and CodeGraph checks (`openspec` CLI unavailable locally)
- [x] 3.4 Add regression checks for snapshot history aggregation
