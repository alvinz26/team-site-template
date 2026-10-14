// Stage 1 acceptance tests T1–T4: the example content builds, and the output
// respects the GitHub Pages base path and the "no external resources" rule.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildSite, withLog } from './helpers/build.mjs';

const SITE_NAME = 'Northvale University Ultimate Frisbee Club';

/** Every root-relative URL ("/...") referenced by the built HTML and CSS. */
function internalUrls(build) {
  const urls = [];
  for (const file of build.files()) {
    if (file.endsWith('.html')) {
      const html = fs.readFileSync(file, 'utf8');
      for (const m of html.matchAll(/\b(?:href|src|action|poster|content)=["']([^"']+)["']/g)) urls.push(m[1]);
      for (const m of html.matchAll(/\bsrcset=["']([^"']+)["']/g)) {
        for (const part of m[1].split(',')) urls.push(part.trim().split(/\s+/)[0]);
      }
    }
    if (file.endsWith('.css')) {
      const css = fs.readFileSync(file, 'utf8');
      for (const m of css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) urls.push(m[1]);
    }
  }
  return urls.filter((u) => u.startsWith('/') && !u.startsWith('//'));
}

/** Resources the browser would load from another host (links the user clicks are fine). */
function externalResources(build) {
  const found = [];
  const isExternal = (u) => /^(https?:)?\/\//i.test(u);
  for (const file of build.files()) {
    if (file.endsWith('.html')) {
      const html = fs.readFileSync(file, 'utf8');
      for (const m of html.matchAll(/<(script|img|iframe|source|video|audio|embed)\b[^>]*\bsrc=["']([^"']+)["']/gi)) {
        if (isExternal(m[2])) found.push(`<${m[1]} src=${m[2]}>`);
      }
      for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
        const href = m[0].match(/\bhref=["']([^"']+)["']/i)?.[1] ?? '';
        const rel = m[0].match(/\brel=["']([^"']+)["']/i)?.[1] ?? '';
        if (isExternal(href) && /stylesheet|preload|modulepreload|icon|preconnect|dns-prefetch|manifest/i.test(rel)) {
          found.push(`<link rel=${rel} href=${href}>`);
        }
      }
    }
    if (file.endsWith('.css')) {
      const css = fs.readFileSync(file, 'utf8');
      for (const m of css.matchAll(/(?:url\(|@import\s+)\s*["']?([^"')\s;]+)/g)) {
        if (isExternal(m[1])) found.push(`css ${m[1]}`);
      }
    }
  }
  return found;
}

// One production-like build shared by T1–T3 (what GitHub Actions will do).
const ci = buildSite({ env: { GITHUB_REPOSITORY: 'alvinz26/team-site-template' } });

test('T1 example content builds and the home page shows the team name', () => {
  assert.ok(ci.ok, withLog('build failed', ci));
  assert.match(ci.html(), new RegExp(SITE_NAME), withLog('team name missing from index.html', ci));
});

test('T2 every internal URL carries the /team-site-template/ base', () => {
  assert.ok(ci.ok, withLog('build failed', ci));
  const urls = internalUrls(ci);
  assert.ok(urls.length > 0, 'expected at least one internal URL (page, image or stylesheet) to check');
  const bad = urls.filter((u) => !u.startsWith('/team-site-template/'));
  assert.deepEqual(bad, [], `URLs missing the base path:\n${bad.join('\n')}`);
});

test('T3 the built site loads no scripts, styles, fonts or images from other hosts', () => {
  assert.ok(ci.ok, withLog('build failed', ci));
  assert.deepEqual(externalResources(ci), []);
});

test('T4a base follows the repository name (copied template called "other-name")', () => {
  const b = buildSite({ env: { GITHUB_REPOSITORY: 'someone/other-name' } });
  assert.ok(b.ok, withLog('build failed', b));
  const urls = internalUrls(b);
  assert.ok(urls.length > 0);
  const bad = urls.filter((u) => !u.startsWith('/other-name/'));
  assert.deepEqual(bad, [], `URLs missing /other-name/:\n${bad.join('\n')}`);
});

test('T4b a <user>.github.io repository is served from the root', () => {
  const b = buildSite({ env: { GITHUB_REPOSITORY: 'someone/someone.github.io' } });
  assert.ok(b.ok, withLog('build failed', b));
  const urls = internalUrls(b);
  assert.ok(urls.length > 0);
  const bad = urls.filter((u) => u.startsWith('/someone.github.io'));
  assert.deepEqual(bad, [], `root site must not use a base path:\n${bad.join('\n')}`);
});

test('T4c a local build (no GITHUB_REPOSITORY) is served from the root', () => {
  const b = buildSite();
  assert.ok(b.ok, withLog('build failed', b));
  const urls = internalUrls(b);
  assert.ok(urls.length > 0);
  const bad = urls.filter((u) => u.startsWith('/team-site-template'));
  assert.deepEqual(bad, [], `local build must not use a base path:\n${bad.join('\n')}`);
});
