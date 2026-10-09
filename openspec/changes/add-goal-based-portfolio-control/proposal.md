## Why

The application records holdings and rule alerts, but it does not connect the annual profit target to a time-aware risk budget, market-value allocation, attribution, or auditable AI report. Several read APIs also do not scope queries to the authenticated user.

## What Changes

- Scope portfolio reads and writes to the authenticated user.
- Add a goal cockpit with target gap, remaining days, required return and capital-gap context.
- Store category minimum and maximum weights and evaluate allocation using current market value.
- Add portfolio attribution and risk metrics for direction detail pages.
- Enrich AI reports with dated metrics, benchmarks and structured evidence.

## Non-Goals

- Automatic order submission.
- Predicting prices or guaranteeing the annual target.
- Adding a quantitative backtesting engine.
