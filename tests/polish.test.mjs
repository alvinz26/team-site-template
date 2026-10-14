// Stage 4 acceptance tests P1–P6: bilingual README, colour contrast, light-colour warning,
// favicon, link-share previews and the 404 page.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'node-html-parser';
import { buildSite, ROOT, withLog } from './helpers/build.mjs';

const ENV = { GITHUB_REPOSITORY: 'alvinz26/team-site-template' };
const BASE = '/team-site-template/';
const ORIGIN = 'https://alvinz26.github.io';

const fixture = buildSite({ env: ENV });
const durham = buildSite({ env: ENV, from: path.join(ROOT, 'content') });
const lightPrimary = buildSite({ env: ENV, mutate: (c) => c.replace('site.yaml', 'primary: "#0f5c6e"', 'primary: "#f4b942"') });

const read = (build, rel) => parse(fs.readFileSync(path.join(build.dist, rel), 'utf8'));
const htmlFiles = (build) => build.files().filter((f) => f.endsWith('.html'));
const relOf = (build, f) => path.relative(build.dist, f).split(path.sep).join('/');

// ---------- P1: README in two languages ----------

const README = {
  'README.md': {
    other: 'README.zh-CN.md',
    headings: ['## What this is', '## Editing the content', '## How long until changes appear', '## When something goes wrong', '## Use this template for your own team'],
  },
  'README.zh-CN.md': {
    other: 'README.md',
    headings: ['## 这是什么', '## 怎么改内容', '## 改完多久生效', '## 出错了怎么办', '## 给自己的队伍用这个模板'],
  },
};

test('P1 README exists in English and Chinese, links to each other, has the required sections and no broken links', () => {
  for (const [file, spec] of Object.entries(README)) {
    const abs = path.join(ROOT, file);
    assert.ok(fs.existsSync(abs), `${file} missing`);
    const text = fs.readFileSync(abs, 'utf8');
    const top = text.split('\n').slice(0, 6).join('\n');
    assert.ok(top.includes(`](${spec.other})`), `${file}: the first lines should link to ${spec.other}`);
    for (const h of spec.headings) assert.ok(text.split('\n').includes(h), `${file}: missing heading "${h}"`);
    for (const m of text.matchAll(/\]\(([^)\s#]+)(#[^)]*)?\)/g)) {
      const target = m[1];
      if (/^(https?:|mailto:)/.test(target)) continue;
      assert.ok(fs.existsSync(path.join(ROOT, target)), `${file}: link to missing file ${target}`);
    }
  }
});

// ---------- P2–P3: colour contrast ----------

function luminance(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/** The colour tokens the built site actually uses. */
function palette(build) {
  const html = fs.readFileSync(path.join(build.dist, 'index.html'), 'utf8');
  const css = build.files().filter((f) => f.endsWith('.css')).map((f) => fs.readFileSync(f, 'utf8')).join('\n') + html;
  const token = (name) => {
    const m = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{3,6})\\b`));
    assert.ok(m, `colour token --${name} not found`);
    return m[1];
  };
  return {
    white: '#ffffff',
    text: token('text'),
    muted: token('text-muted'),
    primary: token('color-primary'),
    onPrimary: token('on-primary'),
    accent: token('color-accent'),
    onAccent: token('on-accent'),
    tint: token('color-tint'),
  };
}

test('P2 text colours meet WCAG AA (4.5:1) for Durham and the fixture palettes', () => {
  for (const [name, build] of [['Durham content', durham], ['fixture', fixture]]) {
    assert.ok(build.ok, withLog(`${name} build failed`, build));
    const p = palette(build);
    const pairs = [
      ['body text on white', p.text, p.white],
      ['muted text on white', p.muted, p.white],
      ['links and headings (primary) on white', p.primary, p.white],
      ['nav and footer text on primary', p.onPrimary, p.primary],
      ['hero text (white) on primary', p.white, p.primary],
      ['button and notice text on accent', p.onAccent, p.accent],
      ['primary text on tint (stats, medals, tags)', p.primary, p.tint],
      ['muted text on tint (stat labels)', p.muted, p.tint],
    ];
    for (const [what, fg, bg] of pairs) {
      const ratio = contrast(fg, bg);
      assert.ok(ratio >= 4.5, `${name}: ${what} is ${ratio.toFixed(2)}:1 (${fg} on ${bg}), needs 4.5:1`);
    }
  }
});

test('P3 a primary colour too light for text gives a build warning (not an error)', () => {
  assert.ok(lightPrimary.ok, withLog('build should still succeed', lightPrimary));
  assert.match(lightPrimary.output, /colors\.primary[^\n]*contrast/i, withLog('expected a contrast warning for colors.primary', lightPrimary));
  assert.doesNotMatch(fixture.output, /colors\.primary[^\n]*contrast/i, 'no warning expected for a dark primary');
});

// ---------- P4–P6: favicon, share previews, 404 ----------

test('P4 every page has a favicon that exists (with and without a logo)', () => {
  for (const [name, build] of [['fixture (has logo)', fixture], ['Durham (no logo)', durham]]) {
    for (const f of htmlFiles(build)) {
      const icon = parse(fs.readFileSync(f, 'utf8')).querySelector('link[rel="icon"]');
      const where = `${name} /${relOf(build, f)}`;
      assert.ok(icon, `${where}: <link rel="icon"> missing`);
      const href = icon.getAttribute('href');
      assert.ok(href.startsWith(BASE), `${where}: favicon must use the base path (${href})`);
      assert.ok(fs.existsSync(path.join(build.dist, decodeURIComponent(href.slice(BASE.length)))), `${where}: favicon file missing (${href})`);
    }
  }
});

test('P5 share previews: og:title, og:description, absolute og:url; a hero image becomes og:image', () => {
  for (const [name, build] of [['fixture', fixture], ['Durham', durham]]) {
    for (const f of htmlFiles(build)) {
      const doc = parse(fs.readFileSync(f, 'utf8'));
      const meta = (p) => doc.querySelector(`meta[property="${p}"]`)?.getAttribute('content');
      const where = `${name} /${relOf(build, f)}`;
      assert.ok(meta('og:title'), `${where}: og:title missing`);
      assert.ok(meta('og:description'), `${where}: og:description missing`);
      assert.ok(meta('og:url')?.startsWith(`${ORIGIN}${BASE}`), `${where}: og:url must be absolute (${meta('og:url')})`);
    }
  }
  const image = read(fixture, 'index.html').querySelector('meta[property="og:image"]')?.getAttribute('content');
  assert.ok(image?.startsWith(`${ORIGIN}${BASE}`), `fixture home has a hero, so og:image is expected (${image})`);
  assert.ok(fs.existsSync(path.join(fixture.dist, decodeURIComponent(image.slice(`${ORIGIN}${BASE}`.length)))), 'og:image file missing');
  // Removed (user-approved, D52): "Durham home has no og:image" — it described today's content,
  // not a rule, and would have failed CI as soon as the club added a hero photo.
});

test('P6 a 404 page with navigation, one heading and a link home', () => {
  for (const [name, build] of [['fixture', fixture], ['Durham', durham]]) {
    const file = path.join(build.dist, '404.html');
    assert.ok(fs.existsSync(file), `${name}: 404.html missing`);
    const doc = parse(fs.readFileSync(file, 'utf8'));
    assert.ok(doc.querySelectorAll('nav[aria-label="Main"] a').length >= 4, `${name}: 404 needs the main navigation`);
    assert.equal(doc.querySelectorAll('h1').length, 1);
    assert.ok(doc.querySelector('main').querySelectorAll('a').some((a) => a.getAttribute('href') === BASE), `${name}: 404 needs a link to the home page`);
  }
});
