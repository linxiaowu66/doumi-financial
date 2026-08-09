## 1. Actual amount synchronization

- [x] 1.1 Recalculate source and destination directions after a fund transfer
- [x] 1.2 Recalculate the source direction after a fund deletion
- [x] 1.3 Reconcile empty directions in the daily job
- [x] 1.4 Calculate actual amount from current holding cost
- [x] 1.5 Display zero progress when expected amount is zero

## 2. Verification

- [x] 2.1 Add regression checks for fund transfers and profitable closed positions
- [x] 2.2 Run TypeScript, diff, and code graph checks (`openspec` CLI unavailable locally)
- [ ] 2.3 Verify the updated tooltip at desktop and 375px-wide viewports (browser unavailable)
