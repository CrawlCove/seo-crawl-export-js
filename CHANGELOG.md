# Changelog

## 1.0.0 — 2026-09-29

Initial release.

- `parseExport` / `Crawl.from` / `readExport`: JSON (crawlcove-export-spec
  1.0.0), CSV (the app's 29-column export) or a parsed object.
- `Crawl` helpers: `summary`, `where`, `pagesWithStatus`, `indexablePages`,
  `issues`, `issuesByPage`, `duplicateTitles`, `page`, `toCsv`, `toJSON`.
- `toCsv` / `fromCsv` round-trip, formula-safe, matching the desktop app.
- Issue rules identical to crawlcove-mcp and crawlcove-sheets. 10 tests,
  including a schema check of the CSV round-trip with the spec's validator.
