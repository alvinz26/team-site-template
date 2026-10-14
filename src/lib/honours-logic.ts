// Pure honours logic, shared by the build, the browser filter script and the unit tests.
// Deliberately has no imports so Node can load it directly in tests.

export type Tags = Record<string, string>;
export type Selection = Record<string, string | undefined>;

/** Does an honour with these tags pass the filters? An empty choice ("All") matches anything. */
export function matches(tags: Tags, selection: Selection): boolean {
  return Object.entries(selection).every(([facet, value]) => !value || tags[facet] === value);
}

export interface ResultType {
  key: string;
  label: string;
  emoji?: string;
  rank: number;
}

export interface HonourPeople {
  result: string;
  roster?: string[];
  captains?: string[];
}

/** alias spelling → canonical name, from site.yaml → honours.aliases. */
export function aliasMap(aliases: Record<string, string[]> | undefined): Map<string, string> {
  const map = new Map<string, string>();
  for (const [canonical, spellings] of Object.entries(aliases ?? {})) {
    for (const s of spellings) map.set(s, canonical);
  }
  return map;
}

/** Everyone who took part in an honour: roster plus captains (D12), aliases merged. */
export function participants(honour: HonourPeople, aliases: Map<string, string>): string[] {
  const names = [...(honour.roster ?? []), ...(honour.captains ?? [])].map((n) => aliases.get(n) ?? n);
  return [...new Set(names)];
}

export interface LeaderboardRow {
  name: string;
  /** result key → how many times */
  counts: Record<string, number>;
}

/**
 * Player leaderboard, ordered like a medal table (D11): most rank-1 results first,
 * then most rank-2, and so on; equal records are listed alphabetically.
 */
export function leaderboard(
  honours: HonourPeople[],
  results: ResultType[],
  aliases: Record<string, string[]> | undefined,
): LeaderboardRow[] {
  const order = [...results].sort((a, b) => a.rank - b.rank).map((r) => r.key);
  const map = aliasMap(aliases);
  const rows = new Map<string, LeaderboardRow>();
  for (const honour of honours) {
    for (const name of participants(honour, map)) {
      const row = rows.get(name) ?? { name, counts: Object.fromEntries(order.map((k) => [k, 0])) };
      row.counts[honour.result] = (row.counts[honour.result] ?? 0) + 1;
      rows.set(name, row);
    }
  }
  return [...rows.values()].sort((a, b) => {
    for (const key of order) {
      const diff = (b.counts[key] ?? 0) - (a.counts[key] ?? 0);
      if (diff !== 0) return diff;
    }
    return a.name.localeCompare(b.name, 'en');
  });
}

// ---------------------------------------------------------------------------
// Duplicate-name detection (D14): warn about spellings that are probably one person.
// ---------------------------------------------------------------------------

const normalise = (name: string) =>
  name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

function editDistance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = row;
  }
  return prev[b.length];
}

/** Are two different spellings likely to be the same person? */
function looksAlike(a: string, b: string): boolean {
  const [x, y] = [normalise(a), normalise(b)];
  if (x === y) return true; // differ only in case, accents, punctuation or spacing
  if (editDistance(x, y) <= (Math.min(x.length, y.length) >= 10 ? 2 : 1)) return true; // Fraser / Frazer
  const [xs, ys] = [x.split(' '), y.split(' ')];
  const [xFirst, yFirst] = [xs[0], ys[0]];
  const sameSurname = xs.length > 1 && ys.length > 1 && xs.at(-1) === ys.at(-1);
  const prefix = Math.min(xFirst.length, yFirst.length) >= 3 && (xFirst.startsWith(yFirst) || yFirst.startsWith(xFirst));
  return sameSurname && prefix; // Josh Smith / Joshua Smith
}

/** Pairs of names (already alias-merged) that look like the same person. */
export function similarNames(names: string[]): [string, string][] {
  const unique = [...new Set(names)].sort((a, b) => a.localeCompare(b, 'en'));
  const pairs: [string, string][] = [];
  for (let i = 0; i < unique.length; i++) {
    for (let j = i + 1; j < unique.length; j++) {
      if (looksAlike(unique[i], unique[j])) pairs.push([unique[i], unique[j]]);
    }
  }
  return pairs;
}
