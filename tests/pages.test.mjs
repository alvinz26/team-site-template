// Stage 2 acceptance tests S0–S14: the pages, layout and navigation.
// Built from tests/fixtures/content (fictional Northvale club) unless noted.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'node-html-parser';
import { buildSite, ROOT, withLog } from './helpers/build.mjs';

const ENV = { GITHUB_REPOSITORY: 'alvinz26/team-site-template' };
const BASE = '/team-site-template/';
const SITE_NAME = 'Northvale University Ultimate Frisbee Club';
const NEWS = ['2026-10-05-northvale-classic-silver', '2026-09-20-freshers-taster-sessions', '2026-04-12-outdoor-nationals-bronze'];

// ---------- builds shared by the tests below ----------

const main = buildSite({ env: ENV });

const variant = buildSite({
  env: ENV,
  mutate: (c) => {
    c.replace('site.yaml', '    honours: Trophy Cabinet', '    honours: Trophy Cabinet\n    news: 新闻\n  home:\n    joinButton: 来训练');
    c.replace('site.yaml', 'primary: "#0f5c6e"', 'primary: "#123456"');
    c.write('site.yaml', `${c.read('site.yaml')}\nnotice: Trials this Saturday — everyone welcome\n`);
    c.write('news/2026-10-10-newest-post.md', '---\ntitle: The newest post\ndate: 2026-10-10\nsummary: Newest.\n---\nBody.\n');
    c.write('news/2025-01-01-old-post.md', '---\ntitle: An older post\ndate: 2025-01-01\nsummary: Old.\n---\nBody.\n');
    c.replace('people.yaml', '  order: 1                      # optional', '  order: 3                      # optional');
  },
});

const off = buildSite({
  env: ENV,
  mutate: (c) => {
    c.replace('site.yaml', '  news: true ', '  news: false ');
    c.remove('pages/join.md');
  },
});

const example = buildSite({ env: ENV, from: path.join(ROOT, 'content') });

// ---------- helpers ----------

/** Parsed HTML of a built page, e.g. page(main, 'people/') */
function page(build, route = '') {
  const file = path.join(build.dist, route, 'index.html');
  assert.ok(fs.existsSync(file), withLog(`page /${route} was not built`, build));
  return parse(fs.readFileSync(file, 'utf8'));
}

/** Every built HTML page as { route, doc }. */
function allPages(build) {
  return build
    .files()
    .filter((f) => f.endsWith('.html'))
    .map((f) => ({ route: path.relative(build.dist, f).split(path.sep).join('/'), doc: parse(fs.readFileSync(f, 'utf8')) }));
}

const text = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
const hrefs = (el) => (el ? el.querySelectorAll('a').map((a) => a.getAttribute('href')) : []);
const navLinks = (doc) => doc.querySelectorAll('nav[aria-label="Main"] a');

/** Internal URL → file in dist (or undefined if it is not internal). */
function targetFile(build, url, fromRoute) {
  if (/^(https?:|mailto:|tel:|\/\/)/i.test(url)) return undefined;
  const [pathPart, hash] = url.split('#');
  let rel;
  if (pathPart === '') rel = fromRoute;
  else {
    assert.ok(pathPart.startsWith(BASE), `internal URL without base path: ${url} (on /${fromRoute})`);
    rel = decodeURIComponent(pathPart.slice(BASE.length));
    if (rel === '' || rel.endsWith('/')) rel += 'index.html';
  }
  return { file: path.join(build.dist, rel), hash };
}

function deadLinks(build) {
  const dead = [];
  for (const { route, doc } of allPages(build)) {
    const urls = [
      ...doc.querySelectorAll('[href]').map((e) => e.getAttribute('href')),
      ...doc.querySelectorAll('[src]').map((e) => e.getAttribute('src')),
    ];
    for (const url of urls) {
      const t = targetFile(build, url, route);
      if (!t) continue;
      if (!fs.existsSync(t.file)) dead.push(`/${route} → ${url}`);
      else if (t.hash && t.file.endsWith('.html')) {
        const target = parse(fs.readFileSync(t.file, 'utf8'));
        if (!target.getElementById(t.hash)) dead.push(`/${route} → ${url} (no element with id="${t.hash}")`);
      }
    }
  }
  return dead;
}

// ---------- S0–S2: everything builds, nothing is broken ----------

test('S0 the example content shipped in content/ builds', () => {
  assert.ok(example.ok, withLog('content/ failed to build', example));
});

test('S1 every page is built', () => {
  assert.ok(main.ok, withLog('build failed', main));
  for (const route of ['', 'about/', 'people/', 'news/', ...NEWS.map((s) => `news/${s}/`), 'contact/']) page(main, route);
});

test('S2 no dead internal links, images or #anchors (fixture, news-off variant and example content)', () => {
  for (const [name, b] of [['fixture', main], ['news off', off], ['example content', example]]) {
    assert.ok(b.ok, withLog(`${name} build failed`, b));
    assert.deepEqual(deadLinks(b), [], `${name}: dead links`);
  }
});

// ---------- S3–S6: navigation, modules, labels, theme ----------

test('S3 every page has the main navigation in order, with the current page marked', () => {
  const order = ['Home', 'About', 'People', 'Trophy Cabinet', 'News', 'Contact'];
  for (const { route, doc } of allPages(main)) {
    const names = navLinks(doc).map(text);
    for (const required of ['Home', 'About', 'People', 'News', 'Contact']) {
      assert.ok(names.includes(required), `/${route}: nav is missing "${required}" (has ${names.join(', ')})`);
    }
    const positions = names.map((n) => order.indexOf(n));
    assert.deepEqual([...positions].sort((a, b) => a - b), positions, `/${route}: nav out of order: ${names.join(', ')}`);
  }
  for (const [route, label] of [['', 'Home'], ['about/', 'About'], ['people/', 'People'], ['news/', 'News'], ['contact/', 'Contact']]) {
    const current = navLinks(page(main, route)).filter((a) => a.getAttribute('aria-current') === 'page');
    assert.deepEqual(current.map(text), [label], `/${route}: aria-current should mark exactly "${label}"`);
  }
});

test('S4 news module off: no news pages, nav item, home section or links', () => {
  assert.ok(off.ok, withLog('build failed', off));
  assert.equal(fs.existsSync(path.join(off.dist, 'news')), false, 'news pages should not be built');
  for (const { route, doc } of allPages(off)) {
    assert.ok(!navLinks(doc).map(text).includes('News'), `/${route}: nav still shows News`);
    const linksToNews = doc.querySelectorAll('a').map((a) => a.getAttribute('href') ?? '').filter((h) => h.startsWith(`${BASE}news`));
    assert.deepEqual(linksToNews, [], `/${route}: still links to news`);
  }
  assert.equal(page(off).querySelector('[data-section="news"]'), null, 'home still has a news section');
});

test('S5 labels override navigation and button text', () => {
  assert.ok(variant.ok, withLog('build failed', variant));
  const home = page(variant);
  assert.ok(navLinks(home).map(text).includes('新闻'), 'nav should show the overridden label 新闻');
  assert.ok(home.querySelectorAll('a').some((a) => text(a) === '来训练'), 'home should show the overridden join button 来训练');
});

test('S6 theme colours come from site.yaml', () => {
  const css = (b) => b.files().filter((f) => /\.(html|css)$/.test(f)).map((f) => fs.readFileSync(f, 'utf8')).join('\n');
  assert.match(css(main), /--color-primary:\s*#0f5c6e/i);
  assert.match(css(variant), /--color-primary:\s*#123456/i);
});

// ---------- S7–S10: page content ----------

test('S7a home: hero, stats, join section', () => {
  const home = page(main);
  assert.match(text(home.querySelector('h1')), new RegExp(SITE_NAME));
  assert.match(text(home), /Fast feet, big hucks, better spirit\./);
  const stats = text(home.querySelector('[data-section="stats"]'));
  assert.match(stats, /2004/);
  assert.match(stats, /80\+/);
  assert.match(text(home.getElementById('join')), /first three sessions are free/);
  assert.ok(hrefs(home.querySelector('main')).some((h) => h.endsWith('#join')), 'a home button should jump to #join');
});

test('S7b home: join section hidden without join.md, button goes to contact instead', () => {
  const home = page(off);
  assert.equal(home.getElementById('join'), null);
  assert.ok(hrefs(home.querySelector('main')).some((h) => h === `${BASE}contact/`), 'join button should fall back to the contact page');
});

test('S7c home: latest three news posts, newest first; hidden when there is no news', () => {
  const linksIn = (b) => hrefs(page(b).querySelector('[data-section="news"]')).filter((h) => /\/news\/.+\//.test(h));
  const unique = (list) => [...new Set(list)];
  assert.deepEqual(unique(linksIn(main)), NEWS.map((s) => `${BASE}news/${s}/`));
  assert.deepEqual(
    unique(linksIn(variant)),
    ['2026-10-10-newest-post', NEWS[0], NEWS[1]].map((s) => `${BASE}news/${s}/`),
  );
});

test('S7d home: committee preview = first group, newest season, at most 4, with a link to People', () => {
  const section = page(main).querySelector('[data-section="committee"]');
  const names = section.querySelectorAll('[data-person]').map((e) => e.getAttribute('data-person'));
  assert.deepEqual(names, ['Maya Okafor', 'Joshua Carter', 'Priya Raman', 'Tom Whitfield']);
  assert.ok(hrefs(section).includes(`${BASE}people/`), 'committee preview should link to the People page');
});

test('S8 people page: newest season only, groups in order, sorted, placeholders for missing photos', () => {
  const doc = page(main, 'people/');
  assert.deepEqual(doc.querySelectorAll('[data-group]').map((g) => g.getAttribute('data-group')), ['committee', 'captains', 'coaches']);
  const people = doc.querySelectorAll('[data-person]').map((e) => e.getAttribute('data-person'));
  assert.ok(!people.includes('Oliver Grant') && !people.includes('Amira Haddad'), 'older seasons should not be listed');
  assert.equal(people.length, 13);
  const card = (name) => doc.querySelector(`[data-person="${name}"]`);
  assert.equal(card('Maya Okafor').querySelector('img')?.getAttribute('alt'), 'Maya Okafor');
  assert.ok(card('Priya Raman').querySelector('[data-placeholder]'), 'missing photo should show a placeholder');
  assert.match(text(card('Eilidh MacLeod')), /end-of-season ceilidh/);
  const coaches = (b) => page(b, 'people/').querySelector('[data-group="coaches"]').querySelectorAll('[data-person]').map((e) => e.getAttribute('data-person'));
  assert.deepEqual(coaches(main), ['Ruth Ellison', 'Kenji Watanabe']);
  assert.deepEqual(coaches(variant), ['Kenji Watanabe', 'Ruth Ellison']);
});

test('S9 news: list newest first; detail shows title, date, cover, body table and body images', () => {
  const list = hrefs(page(main, 'news/').querySelector('main')).filter((h) => /\/news\/.+\//.test(h));
  assert.deepEqual([...new Set(list)], NEWS.map((s) => `${BASE}news/${s}/`));

  const post = page(main, `news/${NEWS[0]}/`);
  assert.equal(text(post.querySelector('h1')), 'Mixed take silver at the Northvale Classic');
  assert.ok(post.querySelector('time[datetime^="2026-10-05"]'), 'date should be in a <time> element');
  const imgs = post.querySelector('main').querySelectorAll('img');
  assert.ok(imgs.length >= 2, 'expected the cover and the body image');
  const bodyImg = imgs.find((i) => i.getAttribute('alt') === 'The mixed squad after the final');
  assert.ok(bodyImg, 'body image written as images/... should render');
  assert.ok(bodyImg.getAttribute('src').startsWith(`${BASE}_astro/`), `body image src: ${bodyImg.getAttribute('src')}`);
  assert.ok(page(main, `news/${NEWS[2]}/`).querySelector('main table'), 'markdown table should render');
});

test('S10 about page renders markdown, tables and body images', () => {
  const doc = page(main, 'about/');
  assert.ok(doc.querySelector('main table'));
  const img = doc.querySelectorAll('main img').find((i) => i.getAttribute('alt') === 'The club on the south field');
  assert.ok(img, 'body image written as images/... should render');
  assert.ok(img.getAttribute('src').startsWith(`${BASE}_astro/`));
});

// ---------- S11–S14: contact, accessibility, menu, notice ----------

test('S11 contact: email link, safe social links, and no forms anywhere', () => {
  const contact = page(main, 'contact/');
  assert.ok(contact.querySelector('main a[href="mailto:hello@example.com"]'), 'email should be a mailto link');
  for (const { route, doc } of allPages(main)) {
    for (const a of doc.querySelectorAll('a[href^="https://example.com/"]')) {
      const rel = a.getAttribute('rel') ?? '';
      assert.equal(a.getAttribute('target'), '_blank', `/${route}: ${a.getAttribute('href')} should open in a new window`);
      assert.ok(/noopener/.test(rel) && /noreferrer/.test(rel), `/${route}: ${a.getAttribute('href')} needs rel="noopener noreferrer"`);
      assert.ok((a.getAttribute('aria-label') ?? text(a)).length > 0, `/${route}: social link needs a readable name`);
    }
    assert.equal(doc.querySelector('form'), null, `/${route}: forms are not allowed`);
  }
  const socials = contact.querySelectorAll('main a[href^="https://example.com/"]').map((a) => a.getAttribute('href'));
  assert.equal(socials.length, 4, 'contact page should list all four socials');
});

test('S12 accessibility basics on every page', () => {
  for (const { route, doc } of allPages(main)) {
    assert.ok(doc.querySelector('html')?.getAttribute('lang'), `/${route}: <html lang> missing`);
    assert.equal(doc.querySelectorAll('h1').length, 1, `/${route}: exactly one <h1>`);
    assert.ok(doc.querySelector('a[href="#main"]'), `/${route}: skip link to #main missing`);
    assert.ok(doc.getElementById('main'), `/${route}: element id="main" missing`);
    for (const img of doc.querySelectorAll('img')) {
      assert.ok(img.hasAttribute('alt'), `/${route}: <img src="${img.getAttribute('src')}"> has no alt attribute`);
    }
  }
});

test('S13 the mobile menu is a real button controlling navigation that exists without JavaScript', () => {
  for (const { route, doc } of allPages(main)) {
    const button = doc.querySelector('header button[aria-controls]');
    assert.ok(button, `/${route}: menu button missing`);
    assert.equal(button.getAttribute('aria-expanded'), 'false', `/${route}: menu should start collapsed`);
    const menu = doc.getElementById(button.getAttribute('aria-controls'));
    assert.ok(menu, `/${route}: aria-controls points to a missing element`);
    assert.ok(menu.querySelectorAll('a').length >= 5, `/${route}: menu should contain the nav links`);
    assert.equal(menu.hasAttribute('hidden'), false, `/${route}: links must not be hidden in the HTML (no-JS visitors)`);
  }
});

test('S14 site-wide notice appears on every page when set, and not otherwise', () => {
  for (const { route, doc } of allPages(variant)) {
    assert.match(text(doc.querySelector('[data-notice]')), /Trials this Saturday/, `/${route}: notice missing`);
  }
  for (const { route, doc } of allPages(main)) {
    assert.equal(doc.querySelector('[data-notice]'), null, `/${route}: no notice expected`);
  }
});
