import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'
import { Crawl, CSV_COLUMNS, fromCsv, ISSUE_TYPES, issuesOf, parseExport, readExport, toCsv, type ExportPage } from '../src/index.js'

const samplePath = new URL('./fixtures/sample-crawl-export.json', import.meta.url)
const sample = readFileSync(samplePath, 'utf8')
const schema = JSON.parse(readFileSync(new URL('./fixtures/crawl-export.schema.json', import.meta.url), 'utf8'))
const validate = (() => { const ajv = new Ajv2020({ allErrors: true, strict: true }); addFormats(ajv); return ajv.compile(schema) })()

describe('parseExport', () => {
  it('loads JSON text, an object, and a file', async () => {
    expect(parseExport(sample).pages).toHaveLength(7)
    expect(parseExport(JSON.parse(sample)).pageCount).toBe(7)
    expect((await readExport(samplePath.pathname)).pages).toHaveLength(7)
  })
  it('rejects non-exports and unsupported versions', () => {
    expect(() => parseExport('{"a":1}')).toThrow(/pages/)
    expect(() => parseExport({ schemaVersion: '2.0.0', pages: [] })).toThrow(/Unsupported/)
    expect(() => parseExport({ schemaVersion: '1.0.0', pages: [{ notUrl: 1 }] })).toThrow(/url/)
  })
})

describe('CSV round trip', () => {
  it('toCsv writes the documented 29 columns and fromCsv reads them back to the same pages', () => {
    const exp = parseExport(sample)
    const csv = toCsv(exp)
    expect(csv.startsWith('﻿')).toBe(true)
    expect(csv.split('\r\n')[0].replace(/^\uFEFF/, '')).toBe(CSV_COLUMNS.join(','))
    const back = fromCsv(csv)
    expect(back.pages).toEqual(exp.pages)
    expect(validate(back)).toBe(true)
  })
  it('guards formula cells and quotes commas, and strips the guard on read', () => {
    const p: ExportPage = { ...parseExport(sample).pages[0], title: '=SUM(A1)', metaDescription: 'a, "b"' }
    const csv = toCsv({ ...parseExport(sample), pages: [p] })
    expect(csv).toContain("'=SUM(A1)")
    expect(csv).toContain('"a, ""b"""')
    expect(fromCsv(csv).pages[0]).toMatchObject({ title: '=SUM(A1)', metaDescription: 'a, "b"' })
  })
  it('parseExport auto-detects CSV', () => {
    expect(parseExport(toCsv(parseExport(sample))).pages).toHaveLength(7)
  })
})

describe('issuesOf (same rules as crawlcove-mcp)', () => {
  const page = (o: Partial<ExportPage>): ExportPage => ({ url: 'https://a.test/', finalUrl: 'https://a.test/', statusCode: 200, contentType: 'text/html', depth: 1, indexable: true, title: 'A fine title for a page', titleLength: null, metaDescription: 'A meta description long enough to be sensible for search results and readers alike.', metaLength: null, canonical: 'https://a.test/', htmlLang: 'en', robotsMeta: null, xRobotsTag: null, h1Count: 1, wordCount: 100, linksInternal: 1, linksExternal: 0, imageCount: 0, imagesMissingAlt: 0, responseTimeMs: null, byteSize: null, rendered: false, redirectHops: 0, fetchError: null, schemaBlocks: 0, hreflangCount: 0, contentFingerprint: '', findingsCount: 0, ...o })
  const types = (pages: ExportPage[]) => issuesOf(pages).map((i) => i.type).sort()
  it('is quiet on a clean page and flags each rule', () => {
    expect(types([page({})])).toEqual([])
    expect(types([page({ statusCode: 404 })])).toEqual(['broken-page'])
    expect(types([page({ statusCode: null, fetchError: 'ETIMEDOUT' })])).toEqual(['broken-page'])
    expect(types([page({ title: '' })])).toEqual(['missing-title'])
    expect(types([page({ title: 'x'.repeat(61) })])).toEqual(['long-title'])
    expect(types([page({ url: 'https://a.test/1' }), page({ url: 'https://a.test/2' })])).toEqual(['duplicate-title', 'duplicate-title'])
    expect(types([page({ metaDescription: null })])).toEqual(['missing-meta-description'])
    expect(types([page({ metaDescription: 'x'.repeat(161) })])).toEqual(['long-meta-description'])
    expect(types([page({ h1Count: 0 })])).toEqual(['missing-h1'])
    expect(types([page({ h1Count: 2 })])).toEqual(['multiple-h1'])
    expect(types([page({ xRobotsTag: 'noindex', indexable: false })])).toEqual(['noindex'])
    expect(types([page({ canonical: null })])).toEqual(['missing-canonical'])
    expect(types([page({ statusCode: 301, redirectHops: 2, indexable: false })])).toEqual(['redirect-chain'])
    expect(types([page({ statusCode: 500, title: '', h1Count: 0, canonical: null })])).toEqual(['broken-page'])
  })
  it('filters by type', () => {
    expect(issuesOf([page({ statusCode: 404 }), page({ url: 'https://a.test/b', h1Count: 0 })], ['missing-h1']).map((i) => i.type)).toEqual(['missing-h1'])
  })
})

describe('Crawl', () => {
  const crawl = Crawl.from(sample)
  it('queries pages', () => {
    expect(crawl.pages).toHaveLength(7)
    expect(crawl.page('https://acmebakery.example/about')?.title).toBe('About Us')
    expect(crawl.where({ urlContains: 'about' })).toHaveLength(1)
    expect(crawl.where({ status: 200 }).every((p) => p.statusCode === 200)).toBe(true)
    expect(crawl.where({ maxDepth: 0 })).toHaveLength(1)
    expect(crawl.pagesWithStatus(404).length + crawl.pagesWithStatus(200).length).toBeLessThanOrEqual(7)
  })
  it('summarises consistently', () => {
    const s = crawl.summary()
    expect(s.pages).toBe(7)
    expect(Object.values(s.byStatus).reduce((a, b) => a + b, 0)).toBe(7)
    expect(Object.values(s.issuesByType).reduce((a, b) => a + b, 0)).toBe(s.issues)
    expect(Object.keys(s.issuesByType)).toEqual([...ISSUE_TYPES])
    expect(crawl.issuesByPage().size).toBe(s.pagesWithIssues)
    expect(s.indexable).toBe(crawl.indexablePages().length)
  })
  it('round-trips through JSON and CSV', () => {
    expect(JSON.parse(JSON.stringify(crawl))).toEqual(crawl.data)
    expect(Crawl.from(crawl.toCsv()).pages).toEqual(crawl.pages)
  })
})
