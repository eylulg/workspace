# Performance

Lighthouse 13 with mobile defaults (slow 4G, 4x CPU slowdown) against the production build, three runs, median kept. `node scripts/perf.mjs <dir> <port>` reproduces the runs. Raw reports are in `docs/perf`.

## What I changed

- The command palette, create dialog and shortcuts dialog mount on first open, not with the shell.
- The board and drag and drop load only when `view=board` is set.
- Issue links use `prefetch={false}`. Next.js was prefetching the issue route after load, which pulled the Markdown renderer (about 48 kB gzip) into the list page.
- The first paint waits for the page content (`<link rel="expect" href="#page-rendered" blocking="render">`, `render-gate.tsx`). On a slow runner the shell painted before the rows, so Lighthouse counted all the scripts before LCP. Browsers without support ignore the link.
- The list renders 12 rows and adds 12 more as you scroll (`use-growing-limit.ts`). Rendering all rows after hydration cost a 500 ms long task. The cost: find in page does not see rows until you scroll near them.

## Results

| Route                 | Score before | Score after | JS gzip (kB) before | after |
| --------------------- | ------------ | ----------- | ------------------- | ----- |
| /en/issues            | 78           | 95          | 375.5               | 301.2 |
| /en/issues?view=board | 100          | 100         | 375.5               | 321.6 |
| /en/issue/WEB-12      | 100          | 100         | 375.5               | 371.8 |
| /en/projects          | 100          | 100         | 328.8               | 306.2 |

The list gain also needed a hydration fix in the component library, which stopped the table being rebuilt after load. LCP on the list went from 4.2 s to about 1 s.

On a CPU as slow as GitHub's runner (Lighthouse on the efficiency cores), the list scored 0.69 before the render gate and 0.91 to 0.93 after. That margin over the 0.9 budget is small.

## What did not help

- The HTML is about 594 kB because 60 issues render about 7 kB of markup each. Trimming props did not shrink it, and showing fewer rows did not change LCP by itself.
- The 200 kB gzip JS target is not met. About 130 kB is the framework and React, and React Aria is most of the rest.

## Budgets in CI

The `performance` job in `ci.yml` runs `lhci autorun` on four routes. Each must score 0.9 or higher, with CLS under 0.1.
