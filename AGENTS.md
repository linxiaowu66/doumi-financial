# AGENTS.md

## Project

Doumi Financial is a Next.js 16 / React 19 / TypeScript application using Prisma and MySQL. UI text is primarily Chinese. API routes live under `app/api`; reusable business logic belongs in `lib`; Prisma schema and migrations live under `prisma`.

## Think before coding

- State assumptions when the request is ambiguous; do not silently choose a materially different behavior.
- Trace the real flow and inspect existing callers before changing shared code.
- Prefer the smallest implementation that satisfies the request. Do not add speculative abstractions, dependencies, or features.

## Surgical changes

- Touch only files required by the request and preserve existing style.
- Reuse existing helpers and API patterns before creating new ones.
- Do not refactor unrelated code or fix pre-existing lint issues as drive-by work.
- Remove only imports, variables, or functions made unused by your own change.

## Verification-driven work

For non-trivial changes, define a concrete check and run it before handoff:

1. Reproduce or identify the affected flow.
2. Implement the smallest root-cause change.
3. Run `pnpm exec tsc --noEmit` and `git diff --check`.
4. Run the relevant test, lint, or build command when practical; distinguish existing failures from regressions.

## Responsive UI requirement

Every new or changed page/component MUST include mobile verification before handoff.

- Check at least a narrow viewport around 375px wide and a desktop viewport.
- Use responsive Ant Design props (`xs`/`sm`/`md`) or responsive CSS instead of fixed desktop-only widths.
- Check long Chinese names, amounts, tags, tables, modals, buttons, and form labels for wrapping or overflow.
- Keep card heights and aligned values consistent within each responsive row.
- Tables must become a usable card/list layout or provide an intentional horizontal scroll on mobile.
- Visual UI work is not complete until the page has been inspected in the browser or with an equivalent screenshot check.

## Database changes

- Update `prisma/schema.prisma` and add a timestamped migration under `prisma/migrations`.
- Run `pnpm prisma generate` after schema changes; generated output is ignored and must be regenerated in each environment.
- Never use `prisma db push` for deployed data. Use `pnpm prisma migrate deploy` or a reviewed SQL migration.

## AI integrations

- AI calls are made in the browser using the user-configured provider, model, key, and Base URL.
- Prompts must identify uncertainty, avoid fabricated real-time facts, and state that financial output is for reference only.
- Persist generated reports through an API; do not put provider secrets in source files or logs.

## Commands

```bash
pnpm dev
pnpm exec tsc --noEmit
pnpm lint
pnpm build
pnpm prisma generate
pnpm prisma migrate deploy
```

## OpenSpec and CodeGraph

- Record future work as an OpenSpec change under `openspec/changes` before implementation.
- Use `openspec validate` to check change artifacts.
- Refresh the code graph with `codegraph sync .` after source changes; use `codegraph status .` to verify it.
