# Performance

Measured with Lighthouse 13 mobile defaults (simulated slow 4G, 4x CPU slowdown, 412 px viewport) against the production build, three runs per route, median kept. Raw reports are in `docs/perf/before` and `docs/perf/after`; `node scripts/perf.mjs <dir> <port>` reproduces them. JS and CSS are gzip transfer sizes of everything requested during the Lighthouse load, which includes the prefetches Next.js starts after the load event.

## Results

| Route                 | Metric          | Before                 | After                  | Delta |
| --------------------- | --------------- | ---------------------- | ---------------------- | ----- |
| /en/issues            | Score           | 78                     | 78                     | 0     |
|                       | JS gzip (kB)    | 375.5                  | 323.0                  | -52.5 |
|                       | HTML raw (kB)   | 594                    | 595                    | 0     |
|                       | Requests        | 29                     | 24                     | -5    |
|                       | LCP (ms)        | 4357                   | 4207                   | -150  |
|                       | CLS / TBT       | 0 / 318 ms             | 0 / 322 ms             | 0     |
| /en/issues?view=board | Score           | 100                    | 100                    | 0     |
|                       | JS gzip (kB)    | 375.5                  | 343.1                  | -32.4 |
|                       | LCP / CLS / TBT | 903 ms / 0.013 / 66 ms | 903 ms / 0.013 / 45 ms |       |
| /en/issue/WEB-12      | Score           | 100                    | 100                    | 0     |
|                       | JS gzip (kB)    | 375.5                  | 395.3                  | +19.8 |
|                       | LCP / CLS / TBT | 903 ms / 0 / 14 ms     | 903 ms / 0 / 15 ms     |       |
| /en/projects          | Score           | 100                    | 100                    | 0     |
|                       | JS gzip (kB)    | 328.8                  | 327.6                  | -1.2  |
|                       | LCP / CLS / TBT | 904 ms / 0 / 15 ms     | 903 ms / 0 / 14 ms     |       |

CSS is 15.2 kB gzip on every route and did not change. There is no `/en/board` route; the board is `/en/issues?view=board`.

## What changed

- The command palette, the create issue dialog and the shortcuts dialog mount on first open instead of with the shell (`workspace-chrome.tsx`). Projects dropped about 30 kB gzip in the first measurement round.
- The board, and with it drag and drop, loads only when `view=board` is set (`issues-view.tsx`). The list no longer downloads it.
- The save view dialog loads on first open (`issue-toolbar.tsx`).
- Issue links in the list and on the board use `prefetch={false}`. Next.js was prefetching the issue route for the first visible rows after load, which pulled the Markdown renderer (about 48 kB gzip) into the list page. Hover still prefetches.

## What did not help or was not the cause

- The Markdown renderer was never in the list route's own chunks. The bundle analysis (`next experimental-analyze`) shows react-markdown, remark and micromark only in the issue route. It reached the list through prefetching.
- The HTML is 594 kB raw because 60 issues render about 7 kB of markup each (three menu buttons with long class strings and seven cells). The flight payload is only 97 kB of that, and the shell and page already pass different shapes of the issue list. Trimming props does not shrink the HTML. Filtering to fewer rows (238 kB HTML) left LCP at about 4.1 s, so row count is not what limits the score.
- The issue route got 20 kB larger in the Lighthouse count. The splitting added small chunks that the browser requests after load, and the cause has not been isolated.

## What is left

- The 200 kB gzip JS target is not met. About 130 kB is the framework and React, and React Aria (Table, menus, buttons) is the rest. Menu triggers in every row and in the toolbar need the menu code at hydration, so deferring it needs a lazy trigger pattern in the library.
- No size-limit entry was added. The Lighthouse budgets in `lighthouserc.json` cap script size per route instead.

## Budgets in CI

The `performance` job in `ci.yml` builds the app and runs `lhci autorun` against four routes. The board, issue and projects routes must score 0.9 or higher. All four routes must score 0.9 or higher; the list was asserted at 0.7 until the Table recreation after hydration was fixed in the library. CLS must stay under 0.1 on all of them.

## After the library performance pass

Relinked `@eylulg/ui` with the hydration-safe Table and lazy overlays, then measured `/en/issues` with `ONLY=issues node scripts/perf.mjs <dir> <port>` (Lighthouse 13 mobile, three runs, median).

| Route      | Metric       | Before the pass | After the pass  |
| ---------- | ------------ | --------------- | --------------- |
| /en/issues | Score (runs) | 78              | 95 (94, 95, 96) |
| /en/issues | JS gzip (kB) | 323.0           | 301.2           |
| /en/issues | LCP (ms)     | 4207            | 1054            |
| /en/issues | CLS / TBT    | 0 / 322 ms      | 0 / 257 ms      |

A `MutationObserver` installed before the page scripts ran, with the page loaded to network idle in Chromium, saw no `THEAD`, `TBODY` or `TR` removed after hydration on `/en/issues` (66 rows present). Before, the header and body were removed and recreated at about 130 ms. The list assertion in `lighthouserc.json` is raised from 0.7 to 0.9 and `lhci autorun` passes on all four routes.
