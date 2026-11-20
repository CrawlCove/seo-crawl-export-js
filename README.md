<a href="https://crawlcove.com/download?utm_source=github&utm_medium=readme&utm_campaign=seo-crawl-export-js"><img src="https://raw.githubusercontent.com/CrawlCove/.github/main/banners/seo-crawl-export-js.svg" width="1200" alt="seo-crawl-export-js: Load, query and convert site crawl data in JavaScript and TypeScript, with typed pages, issues by type and status filters." /></a>

# seo-crawl-export-js

A **JavaScript and TypeScript library for SEO crawl exports**: load, query and convert [Crawl Cove](https://crawlcove.com/?utm_source=github&utm_medium=seo-crawl-export-js) SEO crawl exports in JavaScript or TypeScript. Zero dependencies, fully typed, browser-safe. Reads the JSON export ([crawlcove-export-spec](https://github.com/CrawlCove/seo-crawl-export-spec) 1.0.0) and the desktop app's CSV export, writes CSV back, and answers the questions you'd otherwise write a loop for: which pages are broken, which titles are duplicated, how many issues of each type, what does depth 0–2 look like.

The issue rules are the same as [seo-mcp-server](https://github.com/CrawlCove/seo-mcp-server)'s `get_issues` and [seo-audit-google-sheets](https://github.com/CrawlCove/seo-audit-google-sheets), so a script, an AI assistant and a spreadsheet built on the same export agree.

## Install

```sh
npm install github:CrawlCove/seo-crawl-export-js
# or pin a release:
npm install https://github.com/CrawlCove/seo-crawl-export-js/archive/refs/tags/v1.1.0.tar.gz
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

Exports come from [Crawl Cove](https://crawlcove.com/?utm_source=github&utm_medium=seo-crawl-export-js), the desktop SEO crawler: Reports → Export JSON or CSV. A Screaming Frog export can be converted first with [screaming-frog-export-converter](https://github.com/CrawlCove/screaming-frog-export-converter).

This repo has its own page on crawlcove.com: [Crawl Cove JavaScript library](https://crawlcove.com/open-source/crawlcove-js?utm_source=github&utm_medium=seo-crawl-export-js).

## Related tools

<!-- related:start, kept in step by CrawlCove/.github scripts/related.mjs -->
| Repo | What it does |
|---|---|
| [seo-crawler-cli](https://github.com/CrawlCove/seo-crawler-cli) | Crawl a site from a script or CI. Checks status codes, redirect chains, titles, meta descriptions, H1s, canonicals, noindex and broken links, and fails the build on regressions. |
| [seo-audit-action](https://github.com/CrawlCove/seo-audit-action) | Crawl a staging or preview URL on every pull request. Fails the check on broken links, missing titles, noindex and redirect chains, with the details as a PR comment. |
| [seo-mcp-server](https://github.com/CrawlCove/seo-mcp-server) | Crawl a site, list SEO issues, inspect pages and find broken links from inside Claude, Cursor and other AI assistants. |
| [claude-seo-plugin](https://github.com/CrawlCove/claude-seo-plugin) | Seven SEO skills for Claude Code backed by a real site crawl: audits, broken links, redirects, titles and fixes, from a chat. |
| [seo-chrome-extension](https://github.com/CrawlCove/seo-chrome-extension) | On-page SEO checker with an AI visibility report: which AI crawlers can read the page, snippet blocks, llms.txt and extractability. Nothing leaves the browser. |
| [xml-sitemap-validator](https://github.com/CrawlCove/xml-sitemap-validator) | Check a sitemap or sitemap index against the sitemaps.org protocol and search engine limits. Flags bad URLs, lastmod dates and cross-host entries. |
| [robots-txt-tester](https://github.com/CrawlCove/robots-txt-tester) | Fetch and lint a robots.txt, test which URLs each crawler may fetch and see the deciding line. Fails deploys that block the site. |
| [redirect-chain-checker](https://github.com/CrawlCove/redirect-chain-checker) | Follow every hop of a URL's redirects and flag chains, loops, HTTPS downgrades, meta refreshes and redirects to error pages. |
| [hreflang-checker](https://github.com/CrawlCove/hreflang-checker) | Validate the hreflang tags on a page or across a whole XML sitemap, including self-reference, x-default and return tags. |
| [schema-markup-validator](https://github.com/CrawlCove/schema-markup-validator) | Check every schema.org node on a page against the required and recommended properties for rich results. |
| [seo-test-site](https://github.com/CrawlCove/seo-test-site) | A deliberately broken SEO test site with every planted problem and its expected finding listed, for testing any SEO crawler. |
| [seo-crawl-export-spec](https://github.com/CrawlCove/seo-crawl-export-spec) | An open format for site crawl data: JSON Schema and CSV column reference, with a real sample export and a validator script. |
| [screaming-frog-export-converter](https://github.com/CrawlCove/screaming-frog-export-converter) | Turn an SEO Spider internal_all.csv into the open JSON crawl export format, with a report of which columns carried over. |
| [seo-audit-google-sheets](https://github.com/CrawlCove/seo-audit-google-sheets) | An Apps Script add-on that turns a site crawl export into an audit workbook: pages, issues by type, pages by status and title and meta flags. |
| [wordpress-seo-connector](https://github.com/CrawlCove/wordpress-seo-connector) | Bulk-apply fixes from the Crawl Cove desktop crawler to Yoast SEO, Rank Math, SEOPress or AIOSEO, with a change log and one-click revert. |
<!-- related:end -->

## License

MIT, see [LICENSE](LICENSE).
