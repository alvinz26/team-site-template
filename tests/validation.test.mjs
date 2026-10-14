// Stage 1 acceptance tests T5–T12: the content safety net.
// Every broken-content case must FAIL the build with a message a non-programmer can act on:
// which file, which entry, which field, and what is allowed instead.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSite, withLog } from './helpers/build.mjs';

/** Build with a mutation and assert it fails with output matching every pattern. */
function expectFailure(mutate, patterns) {
  const b = buildSite({ mutate });
  assert.equal(b.ok, false, withLog('build should have FAILED but succeeded', b));
  for (const p of patterns) assert.match(b.output, p, withLog(`error output should match ${p}`, b));
  return b;
}

function expectSuccess(mutate) {
  const b = buildSite({ mutate });
  assert.ok(b.ok, withLog('build should have succeeded', b));
  return b;
}

// ---------- T5 missing required field → file + entry + field ----------

test('T5a people.yaml: missing role names the file, the person, the season and the field', () => {
  expectFailure(
    (c) => c.replace('people.yaml', '- name: Maya Okafor\n  role: President\n', '- name: Maya Okafor\n'),
    [/people\.yaml/, /Maya Okafor/, /2026\/27/, /\brole\b/],
  );
});

test('T5b honours.yaml: missing result names the competition, team, season and field', () => {
  expectFailure(
    (c) => c.replace('honours.yaml', '  team: Open Firsts\n  result: bronze\n', '  team: Open Firsts\n'),
    [/honours\.yaml/, /Student Outdoor Nationals/, /Open Firsts/, /2025\/26/, /\bresult\b/],
  );
});

test('T5c news: missing title names the news file and the field', () => {
  expectFailure(
    (c) => c.replace('news/2026-10-05-northvale-classic-silver.md', 'title: Mixed take silver at the Northvale Classic\n', ''),
    [/2026-10-05-northvale-classic-silver\.md/, /\btitle\b/],
  );
});

test('T5d site.yaml: missing tagline names the file and the field', () => {
  expectFailure(
    (c) => c.replace('site.yaml', 'tagline: Fast feet, big hucks, better spirit.', ''),
    [/site\.yaml/, /\btagline\b/],
  );
});

// ---------- T6 YAML syntax errors must fail (Astro's default only logs them) ----------

test('T6a bad indentation fails the build and points at the line', () => {
  let line = 0;
  const b = expectFailure(
    (c) => {
      c.replace('people.yaml', '- name: Priya Raman\n  role: Treasurer\n  group: committee\n', '- name: Priya Raman\n  role: Treasurer\n group: committee\n');
      line = c.read('people.yaml').split('\n').indexOf(' group: committee') + 1;
    },
    [/people\.yaml/, /line\s*\d+/i],
  );
  // Parsers may report the line before or after the real mistake; allow ±1.
  const reported = Number(b.output.match(/line\s*(\d+)/i)[1]);
  assert.ok(Math.abs(reported - line) <= 1, withLog(`reported line ${reported}, mistake is on line ${line}`, b));
});

test('T6b an unclosed quote in site.yaml fails the build', () => {
  expectFailure(
    (c) => c.replace('site.yaml', 'tagline: Fast feet, big hucks, better spirit.', 'tagline: "Fast feet, big hucks, better spirit.'),
    [/site\.yaml/, /line\s*\d+/i],
  );
});

// ---------- T7 files saved as "UTF-8 with BOM" (Windows Notepad) still work ----------

test('T7 YAML and Markdown files with a BOM build normally', () => {
  const b = expectSuccess((c) => {
    for (const f of ['site.yaml', 'people.yaml', 'honours.yaml', 'news/2026-10-05-northvale-classic-silver.md', 'pages/about.md']) {
      c.write(f, c.read(f), { bom: true });
    }
  });
  assert.match(b.html(), /Northvale University Ultimate Frisbee Club/);
});

// ---------- T8 images: wrong path fails with the path; URLs are rejected ----------

test('T8a a misspelt photo path names the path, the file and the person', () => {
  expectFailure(
    (c) => c.replace('people.yaml', 'photo: images/people/tom-whitfield.svg', 'photo: images/people/tom-whitfeild.svg'),
    [/images\/people\/tom-whitfeild\.svg/, /people\.yaml/, /Tom Whitfield/],
  );
});

test('T8b a missing news cover names the path and the news file', () => {
  expectFailure(
    (c) => c.replace('news/2026-04-12-outdoor-nationals-bronze.md', 'cover: images/news/outdoor-nationals.svg', 'cover: images/news/nope.svg'),
    [/images\/news\/nope\.svg/, /2026-04-12-outdoor-nationals-bronze\.md/],
  );
});

test('T8c an image given as a web address is rejected (images must be local files)', () => {
  expectFailure(
    (c) => c.replace('people.yaml', 'photo: images/people/maya-okafor.svg', 'photo: https://example.com/maya.jpg'),
    [/people\.yaml/, /Maya Okafor/, /https:\/\/example\.com\/maya\.jpg/],
  );
});

// ---------- T9 values that must come from a list → show the allowed values ----------

test('T9a unknown result key lists the allowed results', () => {
  expectFailure(
    (c) => c.replace('honours.yaml', '  team: Mixed\n  result: silver\n  tags:\n    level: Tournament', '  team: Mixed\n  result: platinum\n  tags:\n    level: Tournament'),
    [/honours\.yaml/, /platinum/, /\bgold\b/, /\bsilver\b/, /\bbronze\b/, /\bspirit\b/],
  );
});

test('T9b unknown tag option lists the allowed options for that facet', () => {
  expectFailure(
    (c) => c.replace('honours.yaml', 'surface: Beach', 'surface: Grass'),
    [/honours\.yaml/, /Grass/, /\bsurface\b/, /Indoor/, /Outdoor/, /Beach/],
  );
});

test('T9c unknown facet key in tags lists the allowed facets', () => {
  expectFailure(
    (c) => c.replace('honours.yaml', '    division: Mixed\n  # no roster', '    divison: Mixed\n  # no roster'),
    [/honours\.yaml/, /divison/, /\blevel\b/, /\bsurface\b/, /\bdivision\b/],
  );
});

test('T9d unknown people group lists the allowed groups', () => {
  expectFailure(
    (c) => c.replace('people.yaml', '  role: Treasurer\n  group: committee\n  season: 2026/27', '  role: Treasurer\n  group: committe\n  season: 2026/27'),
    [/people\.yaml/, /Priya Raman/, /committe(?!e)/, /\bcommittee\b/, /\bcaptains\b/, /\bcoaches\b/],
  );
});

test('T9e a season without a 4-digit year is rejected', () => {
  expectFailure(
    (c) => c.replace('people.yaml', '- name: Oliver Grant\n  role: President\n  group: committee\n  season: 2025/26', '- name: Oliver Grant\n  role: President\n  group: committee\n  season: last year'),
    [/people\.yaml/, /Oliver Grant/, /\bseason\b/, /last year/],
  );
});

// ---------- T10 misspelt field names are not silently ignored ----------

test('T10a misspelt field in people.yaml', () => {
  expectFailure(
    (c) => c.replace('people.yaml', '  photo: images/people/maya-okafor.svg', '  phot: images/people/maya-okafor.svg'),
    [/people\.yaml/, /Maya Okafor/, /\bphot\b/],
  );
});

test('T10b misspelt field in site.yaml', () => {
  expectFailure(
    (c) => c.replace('site.yaml', 'tagline: Fast feet', 'tagine: Fast feet'),
    [/site\.yaml/, /\btagine\b/],
  );
});

test('T10c misspelt key under labels', () => {
  expectFailure(
    (c) => c.replace('site.yaml', '    honours: Trophy Cabinet', '    honors: Trophy Cabinet'),
    [/site\.yaml/, /\bhonors\b/, /\blabels\b/],
  );
});

// ---------- T11 colour without quotes (YAML reads "#..." as a comment) ----------

test('T11 an unquoted colour explains that colours need quotes', () => {
  expectFailure(
    (c) => c.replace('site.yaml', 'primary: "#0f5c6e"', 'primary: #0f5c6e'),
    [/site\.yaml/, /colors\.primary/, /quote/i],
  );
});

// ---------- T12 module switches ----------

test('T12a auto: honours while the honours module is off is an error', () => {
  expectFailure(
    (c) => c.replace('site.yaml', '  honours: true ', '  honours: false '),
    [/site\.yaml/, /auto:\s*honours/, /modules\.honours/],
  );
});

test('T12b honours module off: honours.yaml may be deleted', () => {
  expectSuccess((c) => {
    c.replace('site.yaml', '  honours: true ', '  honours: false ');
    c.replace('site.yaml', '  - label: Honours won\n    auto: honours                 # counted automatically from honours.yaml\n', '');
    c.remove('honours.yaml');
  });
});

test('T12c news module off: the news folder may be deleted', () => {
  expectSuccess((c) => {
    c.replace('site.yaml', '  news: true ', '  news: false ');
    c.remove('news');
  });
});
