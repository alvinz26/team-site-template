// The content safety net.
//
// Reads every file in content/, validates it against content-schema.ts plus the rules that
// span files (e.g. a person's `group` must exist in site.yaml), and either returns clean data
// or throws ONE error listing every problem in plain English:
//
//   content/people.yaml → 2026/27 · Maya Okafor (line 12)
//     • role — is required but missing.
//
// Astro's own loaders only log YAML syntax errors and carry on with empty data, and their
// schema errors point at "entry 0" — hence this module (see DECISIONS.md D6, D7, D22).

import fs from 'node:fs';
import path from 'node:path';
import { LineCounter, parseDocument, isSeq, type Document } from 'yaml';
import { z } from 'astro/zod';
import { honourSchema, newsSchema, personSchema, seasonYear, siteSchema } from './content-schema';

/** Where content lives. CONTENT_DIR exists only so tests can point at a scratch copy (D23). */
export const CONTENT_DIR = path.resolve(process.env.CONTENT_DIR ?? 'content');

// Validated shapes, with image fields as content-relative paths (images/...).
type Site = z.output<ReturnType<typeof siteSchema<typeof localImage>>>;
type Person = z.output<ReturnType<typeof personSchema<typeof localImage>>>;
type Honour = z.output<ReturnType<typeof honourSchema<typeof localImage>>>;
type NewsData = z.output<ReturnType<typeof newsSchema<typeof localImage>>>;

export interface Entry<T> {
  id: string;
  /** Absolute path of the file the entry came from. */
  file: string;
  data: T;
}
export interface MarkdownEntry<T> extends Entry<T> {
  body: string;
}
export interface ValidContent {
  site: Site;
  people: Entry<Person>[];
  honours: Entry<Honour>[];
  news: MarkdownEntry<NewsData>[];
  about: MarkdownEntry<Record<string, never>>;
}

// ---------------------------------------------------------------------------
// Problem collection and formatting
// ---------------------------------------------------------------------------

interface Problem {
  file: string; // relative to the repository, e.g. content/people.yaml
  entry?: string;
  field?: string;
  message: string;
}

export class ContentError extends Error {
  constructor(readonly problems: Problem[]) {
    super(formatProblems(problems));
    this.name = 'ContentError';
    // The problem is in the content, not the code: hide the code location Astro would print.
    this.stack = `${this.name}: ${this.message}`;
  }
}

function formatProblems(problems: Problem[]): string {
  const n = problems.length;
  const lines = [
    `Content check failed: ${n} problem${n === 1 ? '' : 's'} found.`,
    'The website was NOT updated. Fix the problems below, save, and it will try again.',
    'Field reference: docs/data-model.md',
  ];
  const groups = new Map<string, Problem[]>();
  for (const p of problems) {
    const heading = p.entry ? `${p.file} → ${p.entry}` : p.file;
    groups.set(heading, [...(groups.get(heading) ?? []), p]);
  }
  for (const [heading, list] of groups) {
    lines.push('', heading);
    for (const p of list) lines.push(`  • ${p.field ? `${p.field} — ` : ''}${p.message}`);
  }
  return lines.join('\n');
}

const rel = (abs: string) => path.relative(path.dirname(CONTENT_DIR), abs).split(path.sep).join('/');
const quote = (v: unknown) => (typeof v === 'string' ? `"${v}"` : JSON.stringify(v));

/** Field path for humans: ['stats', 1, 'auto'] → "stats[2].auto" (list items counted from 1). */
function fieldPath(parts: readonly PropertyKey[]): string {
  return parts.reduce<string>((out, p) => {
    if (typeof p === 'number') return `${out}[${p + 1}]`;
    return out ? `${out}.${String(p)}` : String(p);
  }, '');
}

function valueAt(input: unknown, parts: readonly PropertyKey[]): unknown {
  return parts.reduce<unknown>((v, p) => (v != null && typeof v === 'object' ? (v as any)[p as any] : undefined), input);
}

const TYPE_NAMES: Record<string, string> = {
  string: 'text',
  number: 'number',
  int: 'whole number',
  boolean: 'true or false',
  array: 'list (lines starting with "- ")',
  object: 'group of fields (indented lines underneath)',
  date: 'date written as YYYY-MM-DD',
};

function describeFound(v: unknown): string {
  if (v === null) return 'nothing';
  if (Array.isArray(v)) return 'a list';
  if (typeof v === 'object') return 'a group of fields';
  return quote(v);
}

/** Turn one Zod issue into a sentence a non-programmer can act on. */
function describeIssue(issue: z.core.$ZodIssue, input: unknown): { field: string; message: string }[] {
  const field = fieldPath(issue.path);
  const value = valueAt(input, issue.path);
  switch (issue.code) {
    case 'unrecognized_keys':
      return issue.keys.map((k) => ({
        field: fieldPath([...issue.path, k]),
        message: 'is not a recognised field. Check the spelling, or remove it.',
      }));
    case 'invalid_type': {
      if (value === undefined) return [{ field, message: 'is required but missing.' }];
      if (value === null && /^colors\./.test(field)) {
        return [{
          field,
          message: 'is empty. Colours must be written in quotes, e.g.  primary: "#0f5c6e"  — without quotes, everything after # is treated as a comment.',
        }];
      }
      if (value === null) return [{ field, message: 'is empty. Write a value after the colon, or delete the line.' }];
      const expected = TYPE_NAMES[issue.expected] ?? issue.expected;
      return [{ field, message: `should be a ${expected}, but found ${describeFound(value)}.` }];
    }
    case 'invalid_value':
      return [{ field, message: `${quote(value)} is not allowed. Use one of: ${issue.values.map(String).join(', ')}.` }];
    default: {
      const showValue = value !== undefined && typeof value !== 'object' && !issue.message.includes(quote(value));
      return [{ field, message: `${issue.message}${showValue ? ` (found ${quote(value)})` : ''}.` }];
    }
  }
}

// ---------------------------------------------------------------------------
// Reading files
// ---------------------------------------------------------------------------

function readText(abs: string): string {
  return fs.readFileSync(abs, 'utf8').replace(/^﻿/, '').replace(/\r\n?/g, '\n');
}

interface ParsedYaml {
  value: unknown;
  doc: Document;
  lines: LineCounter;
}

/** Parse YAML; syntax errors become problems with a line number (lineOffset for frontmatter). */
function parseYaml(abs: string, text: string, problems: Problem[], lineOffset = 0): ParsedYaml | undefined {
  const lines = new LineCounter();
  const doc = parseDocument(text, { lineCounter: lines, prettyErrors: false, uniqueKeys: true });
  if (doc.errors.length > 0) {
    // Only the first error: later ones are usually knock-on effects of the same mistake.
    const err = doc.errors[0];
    const pos = lines.linePos(err.pos[0]);
    const detail = err.message.split('\n')[0].replace(/ at line \d+, column \d+:?$/, '');
    const source = text.split('\n')[pos.line - 1] ?? '';
    problems.push({
      file: rel(abs),
      message:
        `YAML syntax problem on line ${pos.line + lineOffset}: ${detail}.\n` +
        `      line ${pos.line + lineOffset} reads: ${JSON.stringify(source)}\n` +
        '      Check that the indentation uses spaces and lines up with the lines around it, and that every quote is closed.',
    });
    return undefined;
  }
  return { value: doc.toJS(), doc, lines };
}

/** Line where list item `i` starts, for friendlier entry labels. */
function itemLine(parsed: ParsedYaml, i: number): number | undefined {
  const seq = parsed.doc.contents;
  if (!isSeq(seq)) return undefined;
  const node = seq.items[i] as { range?: [number, number, number] } | undefined;
  return node?.range ? parsed.lines.linePos(node.range[0]).line : undefined;
}

function splitFrontmatter(text: string): { frontmatter: string; body: string } {
  const m = text.match(/^---[ \t]*\n([\s\S]*?)\n?---[ \t]*(?:\n|$)/);
  return m ? { frontmatter: m[1], body: text.slice(m[0].length) } : { frontmatter: '', body: text };
}

// ---------------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------------

const IMAGE_EXT = /\.(jpe?g|png|webp|gif|svg|avif)$/i;

/** Image field for the pre-check: a local file under content/, written as images/... (D5, D16). */
const localImage = z.string().superRefine((v, ctx) => {
  if (/^[a-z][a-z0-9+.-]*:|^\/\//i.test(v)) {
    ctx.addIssue({ code: 'custom', message: `${quote(v)} is a web address. Images must be files in this repository, e.g. images/people/maya-okafor.jpg` });
  } else if (v.startsWith('/')) {
    ctx.addIssue({ code: 'custom', message: `${quote(v)} must not start with "/". Write the path from the content folder, e.g. images/people/maya-okafor.jpg` });
  } else if (!IMAGE_EXT.test(v)) {
    ctx.addIssue({ code: 'custom', message: `${quote(v)} is not an image file. Use a .jpg, .png, .webp, .gif or .svg file` });
  } else if (!fs.existsSync(path.join(CONTENT_DIR, v))) {
    ctx.addIssue({
      code: 'custom',
      message: `image not found: ${quote(v)}. Check the file name (including capital letters) and that the file is uploaded to content/${path.posix.dirname(v)}/`,
    });
  }
});

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function check<S extends z.ZodType>(
  schema: S,
  input: unknown,
  where: { file: string; entry?: string },
  problems: Problem[],
): z.output<S> | undefined {
  const res = schema.safeParse(input, { reportInput: true });
  if (res.success) return res.data;
  for (const issue of res.error.issues) {
    for (const d of describeIssue(issue, input)) problems.push({ ...where, ...d });
  }
  return undefined;
}

/** Make ids unique while keeping them readable: "2026/27 · Maya Okafor", then "… (2)". */
function uniqueId(base: string, used: Set<string>): string {
  let id = base;
  for (let n = 2; used.has(id); n++) id = `${base} (${n})`;
  used.add(id);
  return id;
}

function loadSite(problems: Problem[]): Site | undefined {
  const abs = path.join(CONTENT_DIR, 'site.yaml');
  if (!fs.existsSync(abs)) {
    problems.push({ file: rel(abs), message: 'file not found. Every site needs a site.yaml.' });
    return undefined;
  }
  const parsed = parseYaml(abs, readText(abs), problems);
  if (!parsed) return undefined;
  const site = check(siteSchema(localImage), parsed.value ?? {}, { file: rel(abs) }, problems);
  if (!site) return undefined;

  const where = { file: rel(abs) };
  const honoursOn = site.modules?.honours ?? true;
  (site.stats ?? []).forEach((s, i) => {
    const field = fieldPath(['stats', i]);
    if ('auto' in s && s.auto === 'honours' && !honoursOn) {
      problems.push({ ...where, field, message: '"auto: honours" cannot be used while modules.honours is false. Remove this stat, or turn the honours module back on.' });
    }
    if ('auto' in s && s.auto === 'seasons' && site.founded === undefined) {
      problems.push({ ...where, field, message: '"auto: seasons" needs the year the club was founded. Add a line such as  founded: 2004' });
    }
  });
  if (honoursOn && !site.honours) {
    problems.push({ ...where, field: 'honours', message: 'is required while modules.honours is true (it defines the results and filters). Add it, or set modules.honours to false.' });
  }
  return site;
}

function loadList<T>(
  name: string,
  schema: z.ZodType<T>,
  label: (raw: any, i: number) => string,
  crossCheck: (item: T) => { field: string; message: string }[],
  problems: Problem[],
): Entry<T>[] {
  const abs = path.join(CONTENT_DIR, name);
  const parsed = parseYaml(abs, readText(abs), problems);
  if (!parsed) return [];
  const list = parsed.value ?? [];
  if (!Array.isArray(list)) {
    problems.push({ file: rel(abs), message: 'should be a list: every entry starts with "- " at the beginning of a line.' });
    return [];
  }
  const used = new Set<string>();
  const out: Entry<T>[] = [];
  list.forEach((raw, i) => {
    const line = itemLine(parsed, i);
    const entry = `${label(raw ?? {}, i)}${line ? ` (line ${line})` : ''}`;
    const where = { file: rel(abs), entry };
    const data = check(schema, raw ?? {}, where, problems);
    if (!data) return;
    const crossProblems = crossCheck(data);
    for (const p of crossProblems) problems.push({ ...where, ...p });
    if (crossProblems.length === 0) out.push({ id: uniqueId(label(raw, i), used), file: abs, data });
  });
  return out;
}

const listOf = (values: string[]) => values.join(', ');

function loadPeople(site: Site | undefined, problems: Problem[]): Entry<Person>[] {
  const groups = site?.people.groups.map((g) => g.key) ?? [];
  return loadList(
    'people.yaml',
    personSchema(localImage),
    (raw, i) => (raw?.name ? `${raw.season ?? '?'} · ${raw.name}` : `entry ${i + 1}`),
    (p) =>
      site && !groups.includes(p.group)
        ? [{ field: 'group', message: `${quote(p.group)} is not one of your groups. Use one of: ${listOf(groups)} (defined in site.yaml → people.groups).` }]
        : [],
    problems,
  );
}

function loadHonours(site: Site | undefined, problems: Problem[]): Entry<Honour>[] {
  const abs = path.join(CONTENT_DIR, 'honours.yaml');
  const honoursOn = site?.modules?.honours ?? true;
  if (!honoursOn) return [];
  if (!fs.existsSync(abs)) {
    problems.push({ file: rel(abs), message: 'file not found. Create it, or set modules.honours to false in site.yaml.' });
    return [];
  }
  const config = site?.honours;
  const results = config?.results.map((r) => r.key) ?? [];
  const facets = new Map((config?.facets ?? []).map((f) => [f.key, f.options]));
  return loadList(
    'honours.yaml',
    honourSchema(localImage),
    (raw, i) => (raw?.competition ? `${raw.season ?? '?'} · ${raw.competition} · ${raw.team ?? '?'}` : `entry ${i + 1}`),
    (h) => {
      if (!config) return [];
      const out: { field: string; message: string }[] = [];
      if (!results.includes(h.result)) {
        out.push({ field: 'result', message: `${quote(h.result)} is not one of your results. Use one of: ${listOf(results)} (defined in site.yaml → honours.results).` });
      }
      for (const [facet, option] of Object.entries(h.tags ?? {})) {
        const options = facets.get(facet);
        if (!options) {
          out.push({ field: `tags.${facet}`, message: `${quote(facet)} is not one of your honour filters. Use one of: ${listOf([...facets.keys()])} (defined in site.yaml → honours.facets).` });
        } else if (!options.includes(option)) {
          out.push({ field: `tags.${facet}`, message: `${quote(option)} is not an option for ${quote(facet)}. Use one of: ${listOf(options)} (capital letters must match).` });
        }
      }
      return out;
    },
    problems,
  );
}

/** "My Post Name.md" → "my-post-name" */
export const slugify = (fileName: string) =>
  fileName.replace(/\.md$/i, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

function loadMarkdown<T>(abs: string, schema: z.ZodType<T>, problems: Problem[]): { data: T; body: string } | undefined {
  const { frontmatter, body } = splitFrontmatter(readText(abs));
  const parsed = parseYaml(abs, frontmatter, problems, 1);
  if (!parsed) return undefined;
  const data = check(schema, parsed.value ?? {}, { file: rel(abs) }, problems);
  return data === undefined ? undefined : { data, body };
}

function loadNews(site: Site | undefined, problems: Problem[]): MarkdownEntry<NewsData>[] {
  const dir = path.join(CONTENT_DIR, 'news');
  if (!(site?.modules?.news ?? true) || !fs.existsSync(dir)) return [];
  const used = new Set<string>();
  const out: MarkdownEntry<NewsData>[] = [];
  for (const name of fs.readdirSync(dir).filter((f) => /\.md$/i.test(f)).sort()) {
    const abs = path.join(dir, name);
    const id = slugify(name);
    if (used.has(id)) {
      problems.push({ file: rel(abs), message: `gives the same web address (/news/${id}/) as another news file. Rename one of them.` });
      continue;
    }
    used.add(id);
    const md = loadMarkdown(abs, newsSchema(localImage), problems);
    if (md) out.push({ id, file: abs, ...md });
  }
  return out;
}

function loadAbout(problems: Problem[]): MarkdownEntry<Record<string, never>> | undefined {
  const abs = path.join(CONTENT_DIR, 'pages', 'about.md');
  if (!fs.existsSync(abs)) {
    problems.push({ file: rel(abs), message: 'file not found. The About page needs this file (it can be short).' });
    return undefined;
  }
  const { body } = splitFrontmatter(readText(abs));
  return { id: 'about', file: abs, data: {}, body };
}

function loadPeopleFile(site: Site | undefined, problems: Problem[]): Entry<Person>[] {
  const abs = path.join(CONTENT_DIR, 'people.yaml');
  if (!fs.existsSync(abs)) {
    problems.push({ file: rel(abs), message: 'file not found. Create it (it may contain just  []  if you have nobody to list yet).' });
    return [];
  }
  return loadPeople(site, problems);
}

/**
 * Validate everything. Throws ContentError listing every problem.
 * Not cached: it takes milliseconds, and `astro dev` must see edits immediately.
 */
export function loadContent(): ValidContent {
  const problems: Problem[] = [];
  const site = loadSite(problems);
  const people = loadPeopleFile(site, problems);
  const honours = loadHonours(site, problems);
  const news = loadNews(site, problems);
  const about = loadAbout(problems);
  if (problems.length > 0 || !site || !about) throw new ContentError(problems);
  return { site, people, honours, news, about };
}

export { seasonYear };
