## Why

The manual-asset dialog uses one form for the account and for whichever month is selected. Adding a month, editing a past month, and renaming the account all write through the same fields, so it is unclear what the save button will change.

## What Changes

- Keep account name, platform, owner, and remark in the account form. Its save button updates only those fields.
- Add or edit a month in its own month-and-balance form inside the history list. Saving a month stays in the dialog.
- Reject a month that already belongs to another row instead of silently overwriting it.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `household-assets`: Manual asset months are added and edited separately from the account profile.

## Impact

- Household asset edit dialog and the asset update API.
