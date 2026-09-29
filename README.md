# crawlcove-export (crawlcove-js)

Load, query and convert [Crawl Cove](https://crawlcove.com/?utm_source=github&utm_medium=crawlcove-js) SEO crawl exports in JavaScript or TypeScript. Zero dependencies, fully typed, browser-safe. Reads the JSON export ([crawlcove-export-spec](https://github.com/CrawlCove/crawlcove-export-spec) 1.0.0) and the desktop app's CSV export, writes CSV back, and answers the questions you'd otherwise write a loop for: which pages are broken, which titles are duplicated, how many issues of each type, what does depth 0–2 look like.

The issue rules are the same as [crawlcove-mcp](https://github.com/CrawlCove/crawlcove-mcp)'s `get_issues` and [crawlcove-sheets](https://github.com/CrawlCove/crawlcove-sheets), so a script, an AI assistant and a spreadsheet built on the same export agree.

## Install

```sh
npm install github:CrawlCove/crawlcove-js
# or pin a release:
npm install https://github.com/CrawlCove/crawlcove-js/archive/refs/tags/v1.0.0.tar.gz
```

The npm package name is `crawlcove-export`; publishing to the registry is coming.

## Use

```ts
import { Crawl, readExport } from 'crawlcove-export'

// Node: read a JSON or CSV export from disk
const crawl = await readExport('crawl-export.json')

// anywhere: from text or a parsed object
const crawl2 = Crawl.from(jsonTextOrCsvTextOrObject)

crawl.summary()
// { pages: 812, indexable: 790, byStatus: { '200': 790, '301': 14, '404': 8 },
//   issues: 63, issuesByType: { 'broken-page': 8, 'missing-title': 0, ... },
//   pagesWithIssues: 41, runIncomplete: false }

crawl.pagesWithStatus(404).map((p) => p.url)
crawl.where({ indexable: true, maxDepth: 2, urlContains: '/blog/' })
crawl.issues(['missing-title', 'duplicate-title'])
crawl.issuesByPage()          // Map<url, Issue[]>
crawl.duplicateTitles()       // Map<title, ExportPage[]>
crawl.page('https://example.com/pricing')?.metaDescription

crawl.toCsv()                 // the app's 29-column CSV, formula-safe
JSON.stringify(crawl)         // the JSON export back out
```

Lower-level functions are exported too: `parseExport`, `fromCsv`, `toCsv`, `parseCsv`, `issuesOf`, `filterPages`, plus the `ExportPage`, `CrawlExport`, `Issue`, `IssueType`, `PageFilter` and `Summary` types and the `ISSUE_TYPES` / `ISSUE_DESCRIPTIONS` / `CSV_COLUMNS` constants.

## Issue rules

| Type | Rule |
|---|---|
| `broken-page` | 4xx/5xx, no response, or a fetch error |
| `missing-title` / `long-title` / `duplicate-title` | no `<title>` / over 60 chars / same title on 2+ pages (200 pages only) |
| `missing-meta-description` / `long-meta-description` | none / over 160 chars (200 pages only) |
| `missing-h1` / `multiple-h1` | 0 / 2+ `<h1>` (200 pages only) |
| `noindex` | robots meta or X-Robots-Tag contains `noindex` |
| `redirect-chain` | 2 or more redirect hops |
| `missing-canonical` | indexable page with no canonical |

Title, meta and H1 rules are skipped on non-200 pages, so an error page is one `broken-page` issue, not five.

## CSV notes

`toCsv` matches the desktop app's export byte for byte in shape: UTF-8 with BOM, CRLF, the 29 documented columns, booleans as `yes`/`no`, nulls as empty cells, and a leading `'` on any cell that would otherwise be read as a spreadsheet formula. `fromCsv` reverses all of that; the JSON-only metadata (`exportedAt`, `auditRunId`, `runIncomplete`) is not in the CSV, so it takes neutral values unless you pass them.

## Works with CrawlCove

Exports come from [Crawl Cove](https://crawlcove.com/?utm_source=github&utm_medium=crawlcove-js), the desktop SEO crawler for Windows and Mac: Reports → Export JSON or CSV. A Screaming Frog export can be converted first with [crawlcove-sf-import](https://github.com/CrawlCove/crawlcove-sf-import).

This repo has its own page on crawlcove.com: [Crawl Cove JavaScript library](https://crawlcove.com/open-source/crawlcove-js?utm_source=github&utm_medium=crawlcove-js).

## Related tools

- [crawlcove-export-spec](https://github.com/CrawlCove/crawlcove-export-spec) — the JSON Schema and CSV column reference this library implements.
- [crawlcove-mcp](https://github.com/CrawlCove/crawlcove-mcp) — the same crawl data for Claude, Cursor and other AI assistants.
- [crawlcove-sheets](https://github.com/CrawlCove/crawlcove-sheets) — Google Sheets add-on that turns a Crawl Cove export into an audit workbook.
- [crawlcove-sf-import](https://github.com/CrawlCove/crawlcove-sf-import) — convert a Screaming Frog export into the Crawl Cove export format.
- [crawlcove-cli](https://github.com/CrawlCove/crawlcove-cli) — headless whole-site crawl with redirect-chain, broken-link, title and noindex checks.
- [crawlcove-action](https://github.com/CrawlCove/crawlcove-action) — the same checks as a GitHub Action on every PR.
- [crawlcove-schema-validator](https://github.com/CrawlCove/crawlcove-schema-validator) — validate a page's JSON-LD against Google's required and recommended rich-result properties.
- [crawlcove-hreflang-checker](https://github.com/CrawlCove/crawlcove-hreflang-checker) — check a page's or a sitemap's hreflang tags.
- [crawlcove-sitemap-validator](https://github.com/CrawlCove/crawlcove-sitemap-validator) — validate an XML sitemap or sitemap index.
- [crawlcove-robots-txt-tester](https://github.com/CrawlCove/crawlcove-robots-txt-tester) — lint a robots.txt and test which URLs each crawler may fetch.
- [crawlcove-redirect-chain-checker](https://github.com/CrawlCove/crawlcove-redirect-chain-checker) — follow every hop of a URL's redirects.

## License

MIT — see [LICENSE](LICENSE).
