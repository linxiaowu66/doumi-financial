## 1. Data and configuration

- [x] 1.1 Add the fund dividend-method setting and pending dividend metadata migration
- [x] 1.2 Expose the setting through fund APIs, types, and the responsive fund modal
- [x] 1.3 Keep both dividend options on one responsive row

## 2. Detection and confirmation

- [x] 2.1 Parse public dividend history and detect yesterday's payments for open holdings
- [x] 2.2 Add idempotent pending dividend creation to the daily cron
- [x] 2.3 Let users review and atomically confirm pending cash or reinvested dividends

## 3. Verification

- [x] 3.1 Add and run a focused parser and entitlement regression check
- [x] 3.2 Run Prisma generation, TypeScript, lint/diff, OpenSpec, and code graph checks
- [ ] 3.3 Inspect the changed UI at desktop and 375px widths
