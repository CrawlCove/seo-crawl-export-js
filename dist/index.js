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
export const ISSUE_TYPES = [
    'broken-page',
    'missing-title',
    'long-title',
    'duplicate-title',
    'missing-meta-description',
    'long-meta-description',
    'missing-h1',
    'multiple-h1',
    'noindex',
    'redirect-chain',
    'missing-canonical'
];
export const ISSUE_DESCRIPTIONS = {
    'broken-page': 'The page returned a 4xx/5xx status or could not be fetched',
    'missing-title': 'No <title>',
    'long-title': '<title> longer than 60 characters (may be truncated in search results)',
    'duplicate-title': 'The same <title> is used on more than one page',
    'missing-meta-description': 'No <meta name="description">',
    'long-meta-description': 'Meta description longer than 160 characters',
    'missing-h1': 'No <h1> on a 200 HTML page',
    'multiple-h1': 'More than one <h1>',
    noindex: 'The page carries a robots noindex directive',
    'redirect-chain': 'The URL went through 2 or more redirects',
    'missing-canonical': 'No <link rel="canonical"> on an indexable page'
};
export const TITLE_MAX = 60;
export const META_MAX = 160;
/** The CSV export's column order, as documented in crawlcove-export-spec docs/csv-columns.md. */
export const CSV_COLUMNS = ['URL', 'Final URL', 'Status', 'Content-Type', 'Depth', 'Indexable', 'Title', 'Title length', 'Meta description', 'Meta length', 'Canonical', 'HTML lang', 'Robots meta', 'X-Robots-Tag', 'H1 count', 'Word count', 'Internal links', 'External links', 'Images', 'Images missing alt', 'Response time (ms)', 'Byte size', 'Rendered', 'Redirect hops', 'Fetch error', 'Schema blocks', 'hreflang count', 'Content fingerprint', 'Findings'];
const FIELDS = ['url', 'finalUrl', 'statusCode', 'contentType', 'depth', 'indexable', 'title', 'titleLength', 'metaDescription', 'metaLength', 'canonical', 'htmlLang', 'robotsMeta', 'xRobotsTag', 'h1Count', 'wordCount', 'linksInternal', 'linksExternal', 'imageCount', 'imagesMissingAlt', 'responseTimeMs', 'byteSize', 'rendered', 'redirectHops', 'fetchError', 'schemaBlocks', 'hreflangCount', 'contentFingerprint', 'findingsCount'];
const INT_FIELDS = new Set(['statusCode', 'depth', 'titleLength', 'metaLength', 'h1Count', 'wordCount', 'linksInternal', 'linksExternal', 'imageCount', 'imagesMissingAlt', 'responseTimeMs', 'byteSize', 'redirectHops', 'schemaBlocks', 'hreflangCount', 'findingsCount']);
const BOOL_FIELDS = new Set(['indexable', 'rendered']);
const NEVER_NULL = { redirectHops: 0, schemaBlocks: 0, hreflangCount: 0, findingsCount: 0, contentFingerprint: '' };
/** RFC 4180 parser: BOM, quoted commas/newlines, doubled quotes, CRLF. */
export function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = '';
    let i = text.charCodeAt(0) === 0xfeff ? 1 : 0;
    let q = false;
    while (i < text.length) {
        const c = text[i];
        if (q) {
            if (c === '"') {
                if (text[i + 1] === '"') {
                    field += '"';
                    i += 2;
                    continue;
                }
                q = false;
                i++;
                continue;
            }
            field += c;
            i++;
            continue;
        }
        if (c === '"') {
            q = true;
            i++;
            continue;
        }
        if (c === ',') {
            row.push(field);
            field = '';
            i++;
            continue;
        }
        if (c === '\r' || c === '\n') {
            row.push(field);
            field = '';
            rows.push(row);
            row = [];
            if (c === '\r' && text[i + 1] === '\n')
                i++;
            i++;
            continue;
        }
        field += c;
        i++;
    }
    if (field !== '' || row.length > 0) {
        row.push(field);
        rows.push(row);
    }
    return rows.filter((r) => !(r.length === 1 && r[0] === ''));
}
/** The desktop app's CSV export → a CrawlExport (metadata fields are not in the CSV, so they take neutral values). */
export function fromCsv(text, meta = {}) {
    const rows = parseCsv(text);
    if (rows.length === 0)
        throw new Error('Empty CSV.');
    const header = rows[0].map((h) => h.trim());
    const idx = new Map();
    CSV_COLUMNS.forEach((col, n) => {
        const i = header.indexOf(col);
        if (i !== -1)
            idx.set(FIELDS[n], i);
    });
    if (!idx.has('url'))
        throw new Error(`Not a Crawl Cove CSV export: no "URL" column (got ${header.slice(0, 6).join(', ')}).`);
    const pages = [];
    for (const row of rows.slice(1)) {
        const p = {};
        for (const f of FIELDS) {
            const i = idx.get(f);
            let v = i === undefined ? undefined : row[i];
            if (typeof v === 'string' && /^'[=+\-@\t\r]/.test(v))
                v = v.slice(1);
            if (BOOL_FIELDS.has(f))
                p[f] = v === 'yes' || v === 'true';
            else if (INT_FIELDS.has(f))
                p[f] = v === undefined || v.trim() === '' || !Number.isFinite(Number(v)) ? null : Number(v);
            else
                p[f] = v === undefined || v === '' ? null : v;
            if (p[f] === null && f in NEVER_NULL)
                p[f] = NEVER_NULL[f];
        }
        if (p.url === null)
            continue;
        pages.push(p);
    }
    return { schemaVersion: '1.0.0', exportedAt: meta.exportedAt ?? new Date(0).toISOString(), auditRunId: meta.auditRunId ?? 0, runIncomplete: meta.runIncomplete ?? false, pageCount: pages.length, pages };
}
function csvCell(v) {
    if (v === null || v === undefined)
        return '';
    if (typeof v === 'boolean')
        return v ? 'yes' : 'no';
    let s = String(v);
    if (/^[=+\-@\t\r]/.test(s))
        s = `'${s}`;
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
/** A CrawlExport → the app's CSV export format (BOM, CRLF, 29 columns, formula-safe). */
export function toCsv(exp) {
    const lines = [CSV_COLUMNS.map(csvCell).join(',')];
    for (const p of exp.pages)
        lines.push(FIELDS.map((f) => csvCell(p[f])).join(','));
    return `﻿${lines.join('\r\n')}\r\n`;
}
function isObject(v) {
    return typeof v === 'object' && v !== null && !Array.isArray(v);
}
/**
 * Accept JSON text, CSV text, or an already-parsed object, and return a
 * CrawlExport. Shape is checked (a pages array of objects each with a url);
 * for full JSON Schema validation use crawlcove-export-spec's validator.
 */
export function parseExport(input) {
    let data = input;
    if (typeof input === 'string') {
        const t = input.replace(/^﻿/, '').trimStart();
        if (t.startsWith('{') || t.startsWith('['))
            data = JSON.parse(t);
        else
            return fromCsv(input);
    }
    if (!isObject(data) || !Array.isArray(data.pages))
        throw new Error('Not a Crawl Cove export: expected an object with a "pages" array (crawlcove-export-spec 1.0.0).');
    if (typeof data.schemaVersion !== 'string')
        throw new Error('Not a Crawl Cove export: missing schemaVersion.');
    if (!data.schemaVersion.startsWith('1.'))
        throw new Error(`Unsupported schemaVersion ${data.schemaVersion}; this library reads 1.x.`);
    for (const p of data.pages)
        if (!isObject(p) || typeof p.url !== 'string')
            throw new Error('Not a Crawl Cove export: every page needs a url.');
    const d = data;
    return { ...d, pageCount: typeof d.pageCount === 'number' ? d.pageCount : d.pages.length };
}
function isNoindex(p) {
    return /\bnoindex\b/i.test(p.robotsMeta ?? '') || /\bnoindex\b/i.test(p.xRobotsTag ?? '');
}
/** Issues for every page, in ISSUE_TYPES order per page. Same rules as crawlcove-mcp / crawlcove-sheets. */
export function issuesOf(pages, types) {
    const want = types ? new Set(types) : null;
    const titleCounts = new Map();
    for (const p of pages)
        if (p.title)
            titleCounts.set(p.title, (titleCounts.get(p.title) ?? 0) + 1);
    const out = [];
    const push = (i) => { if (want === null || want.has(i.type))
        out.push(i); };
    for (const p of pages) {
        const okHtml = p.statusCode === 200 && !p.fetchError;
        if (p.fetchError || p.statusCode === null || p.statusCode >= 400)
            push({ type: 'broken-page', url: p.url, detail: p.fetchError ?? `HTTP ${p.statusCode}` });
        if (p.redirectHops >= 2)
            push({ type: 'redirect-chain', url: p.url, detail: `${p.redirectHops} hops → ${p.finalUrl}` });
        if (!okHtml)
            continue;
        if (!p.title || p.title.trim() === '')
            push({ type: 'missing-title', url: p.url, detail: 'no <title>' });
        else {
            const tl = p.titleLength ?? p.title.length;
            if (tl > TITLE_MAX)
                push({ type: 'long-title', url: p.url, detail: `${tl} chars: "${p.title}"` });
            if ((titleCounts.get(p.title) ?? 0) > 1)
                push({ type: 'duplicate-title', url: p.url, detail: `"${p.title}" is used on ${titleCounts.get(p.title)} pages` });
        }
        if (!p.metaDescription || p.metaDescription.trim() === '')
            push({ type: 'missing-meta-description', url: p.url, detail: 'no meta description' });
        else if ((p.metaLength ?? p.metaDescription.length) > META_MAX)
            push({ type: 'long-meta-description', url: p.url, detail: `${p.metaLength ?? p.metaDescription.length} chars` });
        if (p.h1Count === 0)
            push({ type: 'missing-h1', url: p.url, detail: 'no <h1>' });
        else if (p.h1Count !== null && p.h1Count > 1)
            push({ type: 'multiple-h1', url: p.url, detail: `${p.h1Count} <h1> elements` });
        if (isNoindex(p))
            push({ type: 'noindex', url: p.url, detail: `robots: ${p.robotsMeta ?? p.xRobotsTag}` });
        if (p.indexable && !p.canonical)
            push({ type: 'missing-canonical', url: p.url, detail: 'indexable page without a canonical' });
    }
    return out;
}
export function filterPages(pages, f = {}) {
    return pages.filter((p) => (f.status === undefined || p.statusCode === f.status) &&
        (f.indexable === undefined || p.indexable === f.indexable) &&
        (f.urlContains === undefined || p.url.includes(f.urlContains)) &&
        (f.contentType === undefined || (p.contentType ?? '').toLowerCase().startsWith(f.contentType.toLowerCase())) &&
        (f.minDepth === undefined || (p.depth !== null && p.depth >= f.minDepth)) &&
        (f.maxDepth === undefined || (p.depth !== null && p.depth <= f.maxDepth)));
}
/** A loaded export with query helpers. Construct with `Crawl.from(...)` or `new Crawl(parseExport(...))`. */
export class Crawl {
    data;
    constructor(data) {
        this.data = data;
    }
    static from(input) {
        return new Crawl(parseExport(input));
    }
    get pages() {
        return this.data.pages;
    }
    page(url) {
        return this.data.pages.find((p) => p.url === url || p.finalUrl === url);
    }
    where(filter) {
        return filterPages(this.data.pages, filter);
    }
    pagesWithStatus(status) {
        return filterPages(this.data.pages, { status });
    }
    indexablePages() {
        return filterPages(this.data.pages, { indexable: true });
    }
    issues(types) {
        return issuesOf(this.data.pages, types);
    }
    /** Issues grouped by URL, only for pages that have at least one. */
    issuesByPage() {
        const m = new Map();
        for (const i of this.issues())
            m.set(i.url, [...(m.get(i.url) ?? []), i]);
        return m;
    }
    duplicateTitles() {
        const m = new Map();
        for (const p of this.data.pages)
            if (p.title && p.statusCode === 200)
                m.set(p.title, [...(m.get(p.title) ?? []), p]);
        for (const [k, v] of m)
            if (v.length < 2)
                m.delete(k);
        return m;
    }
    summary() {
        const issues = this.issues();
        const issuesByType = Object.fromEntries(ISSUE_TYPES.map((t) => [t, 0]));
        for (const i of issues)
            issuesByType[i.type]++;
        const byStatus = {};
        for (const p of this.data.pages) {
            const k = p.fetchError ? 'fetch-error' : p.statusCode === null ? 'no-response' : String(p.statusCode);
            byStatus[k] = (byStatus[k] ?? 0) + 1;
        }
        return {
            pages: this.data.pages.length,
            indexable: this.indexablePages().length,
            byStatus,
            issues: issues.length,
            issuesByType,
            pagesWithIssues: new Set(issues.map((i) => i.url)).size,
            runIncomplete: this.data.runIncomplete
        };
    }
    toCsv() {
        return toCsv(this.data);
    }
    toJSON() {
        return this.data;
    }
}
/** Node only: read a JSON or CSV export from disk. */
export async function readExport(path) {
    const { readFile } = await import('node:fs/promises');
    return Crawl.from(await readFile(path, 'utf8'));
}
