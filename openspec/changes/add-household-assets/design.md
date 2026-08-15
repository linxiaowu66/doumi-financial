## Context

External providers do not offer a suitable self-service account API, so manual accounts retain a current balance plus immutable update snapshots. Insurance payments require separate yearly records so updating a policy does not erase payment history. Existing investment directions remain the source of truth for holdings, while household assets capture only an explicit month-end value snapshot.

## Decisions

- Store current asset balance and its as-of date, and append a snapshot whenever either changes.
- Aggregate manual snapshots and explicitly synchronized investment-direction snapshots by month for the household curve.
- Synchronize each investment direction at most once per month; repeating the action updates that month without changing prior months.
- Allow a nullable household-member assignment on each investment direction.
- Keep protection coverage and refundable maturity value separate from liquid/current assets.
- Treat the final five calendar days as the month-end reminder window.
- Scope all household data to the authenticated user.
- Group actual policy contracts under a protection plan. Accident and medical plans default to annual; other types default to long-term, and users may override the default.
- For annual plans, renewal copies product details into a new editable term while clearing the policy number and premium; product replacement retains only the plan, insured member, and insurance type.
- Copying long-term protection creates a separate plan, carries product fields but no payment history, clears the insured member, and asks the user to confirm dates and premium.
- Direct annual-plan copy requires a target member and copies every actual policy term and annual premium into a new plan; unique policy numbers are never copied.
- Repeating a direct copy matches the target plan by its latest policy identity and inserts only missing coverage periods, allowing earlier partial copies to be completed safely.
- Backfill copies the earliest annual term one year backward and clears the policy number and premium so historical actuals must be confirmed.
- Show only the latest annual policy by default and place prior terms in a scrollable modal so routine maintenance cards stay compact even while history is viewed.
- Keep long-term policies as one contract with separate yearly premium payments.
- Calculate cumulative premiums from annual terms' premiums. For long-term policies, infer elapsed annual installments from the effective date and fixed annual premium, with recorded payments overriding their matching years.
- Derive the insurance dashboard and member summaries from the same yearly premium calculation, and switch insured members with tabs.
- Treat accident-insurance gaps of seven days or fewer as acceptable; other annual insurance still requires continuous coverage.
- Ignore resolved historical coverage gaps and surface only current or upcoming gaps.
- Remind users when the latest annual term expires within 30 days or has already expired.

## Non-Goals

- Provider API synchronization.
- Transaction-level household accounting outside existing investment directions.
- Push, email, or system notifications.
- Daily investment-direction synchronization in household assets.
- Automatic insurer renewal or premium quotation.
