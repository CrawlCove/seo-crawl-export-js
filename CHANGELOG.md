# Changelog

## 1.1.0, 2026-11-20

- `duplicate-title` (and `duplicateTitles()`) only compare pages that compete in
  search: a 200 page that did not redirect, is not noindex and does not
  canonicalise to another URL. A `?sort=` variant whose canonical is the
  category, a noindex copy or `/blog` redirecting to `/blog/` no longer reads
  as a duplicate. New exports `competesInSearch()` and `canonicalizesElsewhere()`.
  Same rule as seo-mcp-server 1.1.0 and seo-audit-google-sheets 1.1.0, so the
  three still agree.

## 1.0.0 — 2026-09-29

Initial release.

- `parseExport` / `Crawl.from` / `readExport`: JSON (crawlcove-export-spec
  1.0.0), CSV (the app's 29-column export) or a parsed object.
- `Crawl` helpers: `summary`, `where`, `pagesWithStatus`, `indexablePages`,
  `issues`, `issuesByPage`, `duplicateTitles`, `page`, `toCsv`, `toJSON`.
- `toCsv` / `fromCsv` round-trip, formula-safe, matching the desktop app.
- Issue rules identical to crawlcove-mcp and crawlcove-sheets. 10 tests,
  including a schema check of the CSV round-trip with the spec's validator.
