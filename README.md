# Workspace

An issue tracker you can use without signing in. It has a grouped list, a drag and drop board, a command palette and single key shortcuts, in English, Turkish and German.

Live: https://eg-workspace.vercel.app

Each visitor gets a private copy of a demo workspace (two teams, three projects, 60 made-up issues). Nobody sees anyone else's changes, and a copy is replaced a day after it was created.

## Run it

Needs Node 24. The app depends on the component library as `file:../ui`, so clone [`eylulg/ui`](https://github.com/eylulg/ui) next to this folder and build it once:

```bash
git clone https://github.com/eylulg/ui ../ui
(cd ../ui && npm install && npm run build)
npm install
npm run dev
```

Open http://localhost:3000. Without `DATABASE_URL` the data lives in `.pglite`. Delete that folder to start over. After rebuilding the library, run `npm run relink`.

Other commands: `npm run db:generate` (a migration after a schema change), `npm run db:migrate`, `npm test`, `npm run test:e2e`. CI runs typecheck, lint, format check, knip, tests, build and the end to end suite.

## Decisions

- **PGlite locally, Postgres in production.** One Drizzle schema and one set of migrations serve both, so development and tests need no database server. The cost is two drivers to keep in step.
- **A private copy per visitor.** A guest cookie maps to a workspace named `visitor-<cookie>`. A nightly job deletes copies older than a day. The cost is more rows than one shared demo. `getViewer()` in `src/server/session.ts` is the only place that decides who the viewer is, so real sign in would change that one function.
- **Optimistic updates.** Status, priority, assignee and board moves show at once and roll back with a message if the server refuses.
- **Fractional sort keys** on the board, so moving a card writes one row.
- **Limits on the demo.** 40 writes a minute per visitor (counted in the memory of one server instance, so it stops a script but is not a security boundary), and 150 issues, 30 labels and 20 saved views per copy.

Performance work and its numbers are in [docs/performance.md](docs/performance.md).

## Tests

Server actions run against an in-memory PGlite with the real migrations. Component tests cover the optimistic rollback, the shortcuts and the palette. A test fails the build if a language is missing a message. Playwright runs on the production build: create an issue, move a card by keyboard, switch language, a 375 px screen, and axe checks in light and dark mode.

## Deploy

Vercel with a Neon Postgres database.

1. Create a Neon project and copy the pooled connection string.
2. Create the Vercel project from this repository and set the variables below.
3. Once, from your machine: `DATABASE_URL='<neon string>' npm run db:migrate`.
4. Deploy. `vercel.json` runs `/api/cron/cleanup-demo` every night at 03:00 UTC.

`scripts/vercel-install.sh` clones and builds `eylulg/ui` during the Vercel install, because the library is not on npm yet.

| Variable                   | Required | Purpose                                         |
| -------------------------- | -------- | ----------------------------------------------- |
| `DATABASE_URL`             | yes      | Pooled Postgres string. Empty means PGlite.     |
| `CRON_SECRET`              | yes      | Bearer token Vercel sends to the nightly route. |
| `NEXT_PUBLIC_POSTHOG_KEY`  | no       | Turns on PostHog. Nothing loads without it.     |
| `NEXT_PUBLIC_POSTHOG_HOST` | no       | PostHog host, default EU cloud.                 |
| `PGLITE_DIR`               | no       | Local PGlite folder, or `memory`.               |

[MIT](LICENSE), Eylül Güneş
