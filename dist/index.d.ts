/**
 * crawlcove-export — load, query and convert Crawl Cove crawl exports.
 *
 * Zero dependencies, pure, browser-safe (the only Node import is in
 * readExport, which is a separate export you can ignore). The JSON shape is
 * crawlcove-export-spec 1.0.0; the CSV shape is the desktop app's CSV export
 * (29 columns, documented in the spec's docs/csv-columns.md). Issue rules
 * are the same as crawlcove-mcp's get_issues and crawlcove-sheets, so every
 * tool in the family agrees on the numbers.
 */
export interface ExportPage {
    url: string;
    finalUrl: string | null;
    statusCode: number | null;
    contentType: string | null;
    depth: number | null;
    indexable: boolean;
    title: string | null;
    titleLength: number | null;
    metaDescription: string | null;
    metaLength: number | null;
    canonical: string | null;
    htmlLang: string | null;
    robotsMeta: string | null;
    xRobotsTag: string | null;
    h1Count: number | null;
    wordCount: number | null;
    linksInternal: number | null;
    linksExternal: number | null;
    imageCount: number | null;
    imagesMissingAlt: number | null;
    responseTimeMs: number | null;
    byteSize: number | null;
    rendered: boolean;
    redirectHops: number;
    fetchError: string | null;
    schemaBlocks: number;
    hreflangCount: number;
    contentFingerprint: string;
    findingsCount: number;
}
export interface CrawlExport {
    schemaVersion: string;
    exportedAt: string;
    auditRunId: number;
    runIncomplete: boolean;
    pageCount: number;
    pages: ExportPage[];
}
export declare const ISSUE_TYPES: readonly ['broken-page', 'missing-title', 'long-title', 'duplicate-title', 'missing-meta-description', 'long-meta-description', 'missing-h1', 'multiple-h1', 'noindex', 'redirect-chain', 'missing-canonical'];
export type IssueType = (typeof ISSUE_TYPES)[number];
export declare const ISSUE_DESCRIPTIONS: Record<IssueType, string>;
export interface Issue {
    type: IssueType;
    url: string;
    detail: string;
}
export interface PageFilter {
    status?: number;
    indexable?: boolean;
    urlContains?: string;
    contentType?: string;
    minDepth?: number;
    maxDepth?: number;
}
export declare const TITLE_MAX = 60;
export declare const META_MAX = 160;
/** The CSV export's column order, as documented in crawlcove-export-spec docs/csv-columns.md. */
export declare const CSV_COLUMNS: readonly ['URL', 'Final URL', 'Status', 'Content-Type', 'Depth', 'Indexable', 'Title', 'Title length', 'Meta description', 'Meta length', 'Canonical', 'HTML lang', 'Robots meta', 'X-Robots-Tag', 'H1 count', 'Word count', 'Internal links', 'External links', 'Images', 'Images missing alt', 'Response time (ms)', 'Byte size', 'Rendered', 'Redirect hops', 'Fetch error', 'Schema blocks', 'hreflang count', 'Content fingerprint', 'Findings'];
/** RFC 4180 parser: BOM, quoted commas/newlines, doubled quotes, CRLF. */
export declare function parseCsv(text: string): string[][];
/** The desktop app's CSV export → a CrawlExport (metadata fields are not in the CSV, so they take neutral values). */
export declare function fromCsv(text: string, meta?: Partial<Pick<CrawlExport, 'exportedAt' | 'auditRunId' | 'runIncomplete'>>): CrawlExport;
/** A CrawlExport → the app's CSV export format (BOM, CRLF, 29 columns, formula-safe). */
export declare function toCsv(exp: CrawlExport): string;
/**
 * Accept JSON text, CSV text, or an already-parsed object, and return a
 * CrawlExport. Shape is checked (a pages array of objects each with a url);
 * for full JSON Schema validation use crawlcove-export-spec's validator.
 */
export declare function parseExport(input: string | unknown): CrawlExport;
/** Issues for every page, in ISSUE_TYPES order per page. Same rules as crawlcove-mcp / crawlcove-sheets. */
export declare function issuesOf(pages: ExportPage[], types?: readonly IssueType[]): Issue[];
export declare function filterPages(pages: ExportPage[], f?: PageFilter): ExportPage[];
export interface Summary {
    pages: number;
    indexable: number;
    byStatus: Record<string, number>;
    issues: number;
    issuesByType: Record<IssueType, number>;
    pagesWithIssues: number;
    runIncomplete: boolean;
}
/** A loaded export with query helpers. Construct with `Crawl.from(...)` or `new Crawl(parseExport(...))`. */
export declare class Crawl {
    readonly data: CrawlExport;
    constructor(data: CrawlExport);
    static from(input: string | unknown): Crawl;
    get pages(): ExportPage[];
    page(url: string): ExportPage | undefined;
    where(filter: PageFilter): ExportPage[];
    pagesWithStatus(status: number): ExportPage[];
    indexablePages(): ExportPage[];
    issues(types?: readonly IssueType[]): Issue[];
    /** Issues grouped by URL, only for pages that have at least one. */
    issuesByPage(): Map<string, Issue[]>;
    duplicateTitles(): Map<string, ExportPage[]>;
    summary(): Summary;
    toCsv(): string;
    toJSON(): CrawlExport;
}
/** Node only: read a JSON or CSV export from disk. */
export declare function readExport(path: string): Promise<Crawl>;
