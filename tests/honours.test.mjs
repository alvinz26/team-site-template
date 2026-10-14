// Stage 3 acceptance tests H1–H11: honours page, filters, leaderboard, auto stats,
// duplicate-name warnings. Built from tests/fixtures/content (fictional Northvale club).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'node-html-parser';
import { buildSite, withLog } from './helpers/build.mjs';
import { matches } from '../src/lib/honours-logic.ts';

const ENV = { GITHUB_REPOSITORY: 'alvinz26/team-site-template' };
const BASE = '/team-site-template/';

// ---------- builds ----------

const main = buildSite({ env: ENV });

const variant = buildSite({
  env: ENV,
  mutate: (c) => {
    // A captain who is missing from the roster must still count (D12).
    c.replace('honours.yaml', '  captains:\n    - Sam Patel\n', '  captains:\n    - Sam Patel\n    - Captain Only\n');
    // auto: people = people in the newest season.
    c.replace('site.yaml', '  - label: Members\n', '  - label: Committee size\n    auto: people\n  - label: Members\n');
  },
});

const off = buildSite({
  env: ENV,
  mutate: (c) => {
    c.replace('site.yaml', '  honours: true ', '  honours: false ');
    c.replace('site.yaml', '  - label: Honours won\n    auto: honours                 # counted automatically from honours.yaml\n', '');
  },
});

const empty = buildSite({ env: ENV, mutate: (c) => c.write('honours.yaml', '[]\n') });

// ---------- helpers ----------

function page(build, route = '') {
  const file = path.join(build.dist, route, 'index.html');
  assert.ok(fs.existsSync(file), withLog(`page /${route} was not built`, build));
  return parse(fs.readFileSync(file, 'utf8'));
}

const text = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
const navLinks = (doc) => doc.querySelectorAll('nav[aria-label="Main"] a');
const honoursPage = () => page(main, 'honours/');

// ---------- H1–H4: the honours page ----------

test('H1 honours page exists and is in the navigation between People and News', () => {
  assert.ok(main.ok, withLog('build failed', main));
  const doc = honoursPage();
  assert.equal(text(doc.querySelector('h1')), 'Trophy Cabinet', 'page title uses labels.nav.honours');
  const names = navLinks(doc).map(text);
  assert.ok(names.indexOf('People') < names.indexOf('Trophy Cabinet') && names.indexOf('Trophy Cabinet') < names.indexOf('News'), `nav order: ${names}`);
  const current = navLinks(doc).filter((a) => a.getAttribute('aria-current') === 'page').map(text);
  assert.deepEqual(current, ['Trophy Cabinet']);
});

test('H2 results are grouped by season, newest first, and all 9 are listed', () => {
  const doc = honoursPage();
  const seasons = doc.querySelectorAll('[data-season]').map((s) => s.getAttribute('data-season'));
  assert.deepEqual(seasons, ['2026/27', '2025/26', '2024/25', '2023/24', '2022/23']);
  assert.equal(doc.querySelectorAll('[data-honour]').length, 9);
});

test('H3 a result shows its medal, competition, team, captain, tags, photo and safe links', () => {
  const entry = honoursPage()
    .querySelectorAll('[data-honour]')
    .find((e) => /Student Outdoor Nationals/.test(text(e)) && /2025\/26/.test(e.closest('[data-season]').getAttribute('data-season')));
  assert.ok(entry, 'Student Outdoor Nationals 2025/26 entry missing');
  const t = text(entry);
  for (const expected of ['🥉', 'Bronze', 'Open Firsts', 'Oliver Grant', 'Nationals', 'Outdoor', 'Open']) {
    assert.ok(t.includes(expected), `entry should show "${expected}": ${t}`);
  }
  assert.equal(entry.querySelector('img')?.getAttribute('alt'), 'Open Firsts at Student Outdoor Nationals 2025/26');
  const links = entry.querySelectorAll('a[href^="https://example.com/"]');
  assert.equal(links.length, 2);
  for (const a of links) {
    assert.equal(a.getAttribute('target'), '_blank');
    assert.match(a.getAttribute('rel') ?? '', /noopener/);
  }
});

test('H4 medal summary counts every result type', () => {
  const doc = honoursPage();
  const count = (key) => text(doc.querySelector(`[data-result-count="${key}"]`));
  assert.match(count('gold'), /\b3\b/);
  assert.match(count('silver'), /\b3\b/);
  assert.match(count('bronze'), /\b2\b/);
  assert.match(count('spirit'), /\b1\b/);
});

// ---------- H5: filters ----------

test('H5a one labelled dropdown per facet, with All + the facet options', () => {
  const doc = honoursPage();
  const selects = doc.querySelectorAll('select[data-facet]');
  assert.deepEqual(selects.map((s) => s.getAttribute('data-facet')), ['level', 'surface', 'division']);
  for (const s of selects) {
    assert.ok(doc.querySelector(`label[for="${s.getAttribute('id')}"]`), `select ${s.getAttribute('id')} needs a <label>`);
  }
  const surface = selects[1].querySelectorAll('option').map((o) => [o.getAttribute('value'), text(o)]);
  assert.deepEqual(surface, [['', 'All'], ['Indoor', 'Indoor'], ['Outdoor', 'Outdoor'], ['Beach', 'Beach']]);
});

test('H5b without JavaScript every result is visible', () => {
  const doc = honoursPage();
  const hidden = doc.querySelectorAll('[data-honour]').filter((e) => e.hasAttribute('hidden'));
  assert.equal(hidden.length, 0);
  for (const e of doc.querySelectorAll('[data-honour]')) {
    assert.ok(e.getAttribute('data-tags'), 'each entry carries its tags for the filter script');
  }
});

test('H5c filter logic', () => {
  const womensIndoor = { level: 'Regionals', surface: 'Indoor', division: "Women's" };
  assert.equal(matches(womensIndoor, {}), true, 'no selection matches everything');
  assert.equal(matches(womensIndoor, { division: '' }), true, '"All" matches everything');
  assert.equal(matches(womensIndoor, { division: "Women's", surface: 'Indoor' }), true);
  assert.equal(matches(womensIndoor, { division: "Women's", surface: 'Outdoor' }), false);
  assert.equal(matches({ level: 'Regionals' }, { division: 'Mixed' }), false, 'a missing tag does not match a specific choice');
  // Applied to the built page: Women's + Indoor keeps exactly the two women's indoor results.
  const kept = honoursPage()
    .querySelectorAll('[data-honour]')
    .filter((e) => matches(JSON.parse(e.getAttribute('data-tags')), { division: "Women's", surface: 'Indoor' }));
  assert.equal(kept.length, 2);
});

// ---------- H6–H7: leaderboard and duplicate names ----------

test('H6 leaderboard: medal-table order, aliases merged, ties alphabetical, captains counted', () => {
  const doc = honoursPage();
  const table = doc.querySelector('table[data-leaderboard]');
  assert.ok(table, 'leaderboard table missing');
  assert.ok(table.querySelectorAll('thead th[scope="col"]').length >= 5, 'column headers need scope="col"');
  const rows = table.querySelectorAll('tbody tr[data-player]');
  const players = rows.map((r) => r.getAttribute('data-player'));
  assert.deepEqual(players.slice(0, 6), ['Maya Okafor', 'Joshua Carter', 'Marcus Lee', 'Oliver Grant', 'Rhys Morgan', 'Sofia Marchetti']);
  const cells = (name) => rows.find((r) => r.getAttribute('data-player') === name).querySelectorAll('td').map(text);
  assert.deepEqual(cells('Maya Okafor').slice(-4), ['2', '1', '0', '1']);
  assert.ok(!players.includes('Josh Carter'), '"Josh Carter" should be merged into "Joshua Carter"');
  assert.ok(players.includes('Isla Fraser') && players.includes('Isla Frazer'), 'un-aliased spellings stay separate');
  const variantPlayers = page(variant, 'honours/').querySelectorAll('tr[data-player]').map((r) => r.getAttribute('data-player'));
  assert.ok(variantPlayers.includes('Captain Only'), 'a captain missing from the roster still counts');
});

test('H7 similar names are reported in the build log (aliased ones are not), and the build still succeeds', () => {
  assert.ok(main.ok);
  const warnings = main.output.split('\n').filter((l) => /possible duplicate/i.test(l) || /Isla Fra[sz]er/.test(l));
  const joined = warnings.join('\n');
  assert.match(joined, /Isla Fraser/);
  assert.match(joined, /Isla Frazer/);
  assert.match(main.output, /aliases/, 'the warning should show how to merge them with aliases');
  assert.ok(!/possible duplicate[^\n]*Josh/i.test(main.output), 'Josh/Joshua is already aliased and must not be reported');
});

// ---------- H8–H11: home page, auto stats, module switches ----------

test('H8 home: honours block between news and committee with counts, 3 latest results and a link', () => {
  const home = page(main);
  const block = home.querySelector('[data-section="honours"]');
  assert.ok(block, 'home honours block missing');
  assert.match(text(block.querySelector('[data-result-count="gold"]')), /\b3\b/);
  const latest = block.querySelectorAll('[data-honour]').map(text);
  assert.equal(latest.length, 3);
  assert.match(latest[0], /Northvale Classic/);
  assert.match(latest[1], /Student Outdoor Nationals/);
  assert.match(latest[2], /Northern Indoor Regionals/);
  assert.ok(block.querySelectorAll('a').some((a) => a.getAttribute('href') === `${BASE}honours/`), 'link to the honours page');
  const order = home.querySelector('main').childNodes.filter((n) => n.getAttribute?.('data-section')).map((n) => n.getAttribute('data-section'));
  assert.ok(order.indexOf('news') < order.indexOf('honours') && order.indexOf('honours') < order.indexOf('committee'), `section order: ${order}`);
});

test('H9 automatic stats: honours = 9, seasons = 23, people = 13', () => {
  const stat = (doc, label) =>
    doc.querySelector('[data-section="stats"]').querySelectorAll('li').map(text).find((t) => t.includes(label)) ?? '';
  const home = page(main);
  assert.match(stat(home, 'Honours won'), /\b9\b/);
  assert.match(stat(home, 'Seasons played'), /\b23\b/);
  assert.match(stat(page(variant), 'Committee size'), /\b13\b/);
});

test('H10 honours module off: no page, nav item or home block', () => {
  assert.ok(off.ok, withLog('build failed', off));
  assert.equal(fs.existsSync(path.join(off.dist, 'honours')), false);
  const home = page(off);
  assert.ok(!navLinks(home).map(text).includes('Trophy Cabinet'));
  assert.equal(home.querySelector('[data-section="honours"]'), null);
});

test('H11 no honours yet: page says so, home block hidden', () => {
  assert.ok(empty.ok, withLog('build failed', empty));
  assert.match(text(page(empty, 'honours/').querySelector('main')), /No honours yet\./);
  assert.equal(page(empty).querySelector('[data-section="honours"]'), null);
});
