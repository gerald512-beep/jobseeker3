@AGENTS.md

# jobseeker3: project context

This is a personal job monitor. It scans company career boards for **Strategy & Operations (S&O)** and **Customer Experience (CX)** roles in the US, stores them in SQLite, and shows them in a Next.js UI. It also tracks **every US Adobe posting** with daily counts. The owner uses it for their own job search. They run scans by hand and act on the results.

This file holds everything learned in past Claude sessions (2026-11-08 to 2026-11-10). Per-machine Claude memory does not move between laptops, so anything worth keeping goes here.

## Working with the user

### "run the scan"
Run `npm run scan` (about 2 minutes). Then report:
1. Totals: matching S&O/CX jobs, new, changed/updated, marked inactive, and any fetch failures (`[scan] ... failed`).
2. **New jobs**, grouped by category (S&O, CX), newest first.
3. **Updated jobs**: existing postings whose title, location or posted date changed. The scanner resets their `firstSeenAt`, so they look new. Label them separately from brand-new jobs. If an old posting closed and a new one opened for the same role, call it a re-post.
4. **Adobe tracker**: jobs posted today and open count (from the `[daily]` lines), and today's Adobe postings if there are any.
5. A short fit note. Flag matches that clearly aren't S&O/CX. These usually come in through the broad CX keywords `product manager` / `program manager`, or through a department name such as "Business Operations".

`npx tsx scripts/show-new.ts` lists everything with `firstSeenAt` after the previous run. That means new **and** updated jobs together. The scan log's `New: N. Updated: M.` gives the split.

### Job listing format (standing rule, asked for 2026-11-08)
Every job you list, including one-line "also worth a look" mentions, must show:
- its **posted date** as `YYYY-MM-DD` (the `createdAt` field), and
- its **URL** as a bare link on its own line.

Sort newest first. Example:
```
**Uber**, Strategy & Operations Lead, Global Marketing (New York City, NY) · Posted 2026-11-10
https://jobs.uber.com/en/jobs/300300/
```

### Other preferences and decisions
- **Scans stay manual.** The user declined a scheduled task (2026-11-09). Don't set one up unless asked.
- **Git:** commit only when asked. When asked to "commit and push", commit on `master` and push to `origin master` (https://github.com/gerald512-beep/jobseeker3). The user doesn't use feature branches or PRs. They asked for `master` after a branch push confused them. No git identity is configured globally, so copy the author from existing commits: `git -c user.name="$(git log -1 --format=%an)" -c user.email="$(git log -1 --format=%ae)" commit ...`. Never commit `*.db`, `.env`, screenshots or JSON dumps.
- **No bot-check circumvention.** If a career site sits behind Cloudflare Turnstile or similar, find the ATS behind it (Greenhouse, Workday, etc.) and use its public API, or tell the user it can't be scanned. Don't drive a real browser past the challenge.
- **"When was this posted?"** Use the ATS's first-published date (Greenhouse `first_published`), not the career page's JSON-LD `datePosted`, which is often the last-edit date. Give both dates if they differ.
- Before risky DB work (schema changes, re-scans after scanner changes), copy `prisma/dev.db` to a backup first.

## New-machine setup (Windows)
`prisma/dev.db` and `.env` are **not in git**. Copy them from the old machine, or the job history is lost. A fresh DB makes the first scan a baseline, so nothing gets flagged as new.

1. Install Node LTS (`winget install OpenJS.NodeJS.LTS`) and Git. Clone the repo.
2. Copy from the old machine:
   - `prisma/dev.db`: the live database, about 800 KB. The root `dev.db` is an old 28 KB leftover and isn't needed.
   - `.env` with `DATABASE_URL="file:./dev.db"` (resolves to `prisma/dev.db`), `ADZUNA_APP_ID` and `ADZUNA_APP_KEY` (used by the Search tab).
3. `npm install`
4. `npx prisma generate`. The client goes to `src/generated/prisma`, which is gitignored, so it must be regenerated.
5. `npx playwright install chromium`. Uber and Waymo need it.
6. Check: `npm run scan` should finish with no `failed` lines and should **not** say "Baseline". The DB snapshot on 2026-11-10 was 301 scan runs, 2,412 job rows (1,185 active), and 485 matching S&O/CX jobs. Adobe had 166 open.
7. The first `git push` opens a Git Credential Manager sign-in to GitHub.

## Architecture
- **Stack:** Next.js 16.2.9 (App Router; see AGENTS.md: read `node_modules/next/dist/docs/` before writing Next code), React 19, Tailwind 4, Prisma 6.19.3 + SQLite, tsx, date-fns, Playwright.
- **Scanner:** `src/lib/scanner/`
  - `index.ts`: `runScan(db)`. Fetches every company concurrently through the `FETCHERS` map (keyed by `Source`), dedupes by job ID, and diffs against the `Job` table to find new, changed and gone jobs. It also writes a `ScanRun` row and calls `recordDailyStats`.
  - `companies.ts`: the `COMPANIES` list. Each entry has slug, label, source and category. Many boards appear twice, once as `so` and once as `cx`. Optional fields:
    - `wdInstance` / `wdBoard` (Workday)
    - `ttDomain` (Teamtailor)
    - `keywords`: replaces the category list (Workday only; PwC uses it)
    - `jdKeywords`: case-sensitive words required in the JD (TikTok only; uses `GNE`)
    - `trackAll` (Adobe tracker)
  - Fetchers:
    - Standard ATS APIs: `greenhouse.ts`, `ashby.ts`, `lever.ts`, `smartrecruiters.ts`, `workday.ts`, `teamtailor.ts`
    - Custom: `adobe.ts` / `qualtrics.ts` (Phenom), `medallia.ts` (Jibe), `tiktok.ts` (lifeattiktok API; the posted date comes from the job ID), `ebay.ts`, `waymo.ts` (sitemap/JSON-LD)
    - `uber.ts` calls Uber's API from inside Playwright Chromium to get past Cloudflare
    - `glassbox.ts` is unused; Glassbox is scanned through Greenhouse `glassboxltd`
  - `keywords.ts` (S&O include/exclude) and `cx-keywords.ts` (CX). These match a lowercase substring against **title + department**.
  - `location.ts`: parses locations and keeps US jobs only.
  - `daily.ts`: Adobe daily record. `localDate()` uses date-fns local dates; never use `toISOString()` for calendar days.
- **Categories:** `so`, `cx`, `adobe`. The Adobe tracker entry (`category: "adobe"`, `trackAll: true`) keeps every US Adobe job with no keyword filter. Its job IDs are `adobe-all-<jobId>`, and it's left out of the S&O/CX new/total counts. Adobe is fetched once per scan (memoized for 5 minutes) and shared by its so, cx and adobe entries.
- **DB:** `prisma/schema.prisma`
  - `Job`: `createdAt` is the posted date string; `firstSeenAt` is reset when a job changes. `isNew` is cleared every scan. `isActive=false` is a soft delete; rows are never hard-deleted.
  - `ScanRun`: one row per scan; `error` lists fetch failures.
  - `DailyStat`: Adobe only. Primary key is (date, slug, category). Fields: `posted` (recomputed from `createdAt` every scan), `discovered`, `active`, `scannedAt`.
  - Baselines: the first scan ever, and a category's first scan, store jobs without flagging them as new.
- **UI:** `src/app/page.tsx` has tabs for S&O, CX, Search (Adzuna; 250 calls/day quota) and Adobe (`components/DailyTracker.tsx`: stat tiles, posted-per-day bar chart, jobs grouped by day, daily record table, 7/14/30/90-day ranges).
- **API routes:** `src/app/api/`
  - `jobs`, `filters`, `search`, `daily` (`?slug=adobe&category=adobe&days=30`)
  - `scan` (POST) requires header `x-scan-secret` = `SCAN_SECRET`. That variable isn't in `.env`, so the route always returns 401. Use `npm run scan`.
- **Scripts:** `scripts/`
  - `scan.ts` (`npm run scan`) and `show-new.ts` work.
  - `show-updated.mjs` is broken: it queries a nonexistent `updatedAt` column.
  - `show-prev.ts` is broken: it reads a nonexistent `newJobs`.
  - The `audit-*.mjs` scripts carry stale keyword copies.

## Windows and tooling gotchas
- The shell is PowerShell, with Git Bash also available. If `node` isn't found in an old PowerShell window, run `$env:Path = "C:\Program Files\nodejs;$env:Path"`.
- Scratch TS scripts that use top-level await must be `.mts` when run with tsx.
- When importing the Prisma client by absolute path from outside the repo, use a `file:///C:/Dev/jobseeker3/src/generated/prisma/index.js` URL. A bare `C:/...` path fails with ERR_UNSUPPORTED_ESM_URL_SCHEME.
- Pre-existing lint/type errors, not caused by recent work:
  - tsc: `scripts/show-prev.ts`
  - eslint: set-state-in-effect in `page.tsx`
  - eslint also lints `src/generated/` because it isn't ignored

## Known issues (from the 2026-11-09 analysis; still open as of 2026-11-10)
1. **A job matching both categories lands in only one tab, at random.** Job IDs (e.g. `gh-${slug}-${id}`) don't include the category, the dedupe keeps the last fetch, and the category is never updated. Fixing this needs a one-time ID migration, or recent jobs will all resurface as new.
2. **One failed fetch can mark a whole company inactive.** Every fetcher except Adobe catches errors and returns `[]`, which `runScan` reads as "all jobs gone". Transient connection resets did this on 2026-11-09 and the DB had to be restored. The fix: fetchers should throw (as `adobe.ts` does) so `failedKeys` protects their jobs.
3. **Boards listed under both S&O and CX are downloaded twice per scan.** Verizon alone is about 62 pages per pass. Fetching each board once and testing both keyword lists would also fix #1.
4. **The "Today" filter uses UTC dates.** `toISOString()` in `api/jobs/route.ts:32` and `JobCard.tsx:19-21` means that after 4pm Pacific, "Today" shows nothing. Use date-fns `format(d, "yyyy-MM-dd")`.
5. **Changed jobs resurface without the "New" badge.** `firstSeenAt` is reset but `isNew` isn't set.
6. **Keyword and location matching mistakes:**
   - Department-only matches get through. For example, Fleetio "Systems Administrator" matched S&O because its department is "Business Operations".
   - The CX keywords `product manager` / `program manager` pull in every PM role.
   - `location.ts:133` reads "San Francisco - HQ" as a country, so the job is dropped silently.
   - Ashby `secondaryLocations` and Greenhouse `offices` are ignored.
7. **Smaller items:**
   - Duplicated, incomplete US-state tables (Uber/Waymo/eBay).
   - `totalJobs` is counted before dedupe.
   - Nothing stops two scans running at once.
   - Each Search page click spends 3 Adzuna calls.
   - The README is still the create-next-app default.
   - There are no tests.
   - Root clutter (PNGs, JSON dumps, `.playwright-mcp/`, root `dev.db`) is untracked; consider adding `*.db` to `.gitignore`.

The user was offered fixes for #1–#3 together and hasn't decided yet.

## Pending requests
- **Add Qcells (https://careers.qcells.com/) to S&O and CX.** Blocked: the whole site is behind Cloudflare Turnstile, and no Greenhouse, Lever, Ashby, SmartRecruiters, iCIMS, Jobvite or Paradox board exists for Qcells or Hanwha. Waiting on the user to open a job, click **Apply**, and paste the URL it lands on. If that URL is a known ATS (Workday, iCIMS, SuccessFactors, UKG…), add Qcells to both categories, fetched once per scan. If it stays on careers.qcells.com, tell the user it can't be scanned.
- **Zip:** offered to add its Greenhouse board `zipcolimited` to CX and S&O (one line per category in `companies.ts`). No answer yet.

## History
- 2026-11-08/09: repo analysis; installed Node 26 LTS and Playwright Chromium on the old laptop; added the Adobe daily tracker; committed TikTok/PwC work (`7589e6e`) and the Adobe tracker (`23f086d`) to `master`.
- Scans: #299 (2026-11-09), #300 (2026-11-10, 8 truly new), #301 (2026-11-10: 485 jobs, 2 new, 3 updated, 1 inactive).
