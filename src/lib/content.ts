// The ONLY module pages use to read content (SPEC constraint 9).
// To move content to an API or CMS later, change this file and content.config.ts — not the pages.

import { getCollection, getEntry } from 'astro:content';
import { seasonYear } from './content-schema';
import { leaderboard } from './honours-logic';
import { mergeLabels } from './labels';

export async function getSite() {
  const entry = await getEntry('site', 'site');
  if (!entry) throw new Error('site.yaml was not loaded'); // unreachable: validation fails the build first
  const site = entry.data;
  return {
    ...site,
    labels: mergeLabels(site.labels),
    modules: { honours: site.modules?.honours ?? true, news: site.modules?.news ?? true },
  };
}

export type Site = Awaited<ReturnType<typeof getSite>>;

/** People in the newest season, grouped in site.yaml order and sorted by `order`, then file order. */
export async function getCurrentPeople() {
  const site = await getSite();
  const people = (await getCollection('people')).map((e, i) => ({ ...e.data, index: i }));
  const latest = Math.max(0, ...people.map((p) => seasonYear(p.season)));
  const current = people.filter((p) => seasonYear(p.season) === latest);
  const byOrder = (a: (typeof current)[number], b: (typeof current)[number]) =>
    (a.order ?? Infinity) - (b.order ?? Infinity) || a.index - b.index;
  return site.people.groups
    .map((g) => ({ ...g, people: current.filter((p) => p.group === g.key).sort(byOrder) }))
    .filter((g) => g.people.length > 0);
}

export type Person = Awaited<ReturnType<typeof getCurrentPeople>>[number]['people'][number];

/** News posts, newest first. Empty when the news module is off. */
export async function getNews() {
  const site = await getSite();
  if (!site.modules.news) return [];
  return (await getCollection('news')).sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export const getPage = (id: 'about' | 'join') => getEntry('pages', id);

// ---------------------------------------------------------------------------
// Honours (Stage 3)
// ---------------------------------------------------------------------------

/** Honours, newest season first (file order within a season). Empty when the module is off. */
export async function getHonours() {
  const site = await getSite();
  if (!site.modules.honours) return [];
  const all = (await getCollection('honours')).map((e) => e.data);
  return all.sort((a, b) => seasonYear(b.season) - seasonYear(a.season)); // stable: keeps file order
}

export type Honour = Awaited<ReturnType<typeof getHonours>>[number];

/** Result types (best first) with how many honours have each one. */
export async function getMedalSummary() {
  const site = await getSite();
  const honours = await getHonours();
  return [...(site.honours?.results ?? [])]
    .sort((a, b) => a.rank - b.rank)
    .map((r) => ({ ...r, count: honours.filter((h) => h.result === r.key).length }));
}

export async function getLeaderboard() {
  const site = await getSite();
  return leaderboard(await getHonours(), site.honours?.results ?? [], site.honours?.aliases);
}

/** Home-page stats with `auto:` values calculated (D13). */
export async function getStats() {
  const site = await getSite();
  const honours = await getHonours();
  const people = (await getCollection('people')).map((e) => e.data);
  const peopleLatest = Math.max(0, ...people.map((p) => seasonYear(p.season)));
  const latest = Math.max(peopleLatest, ...honours.map((h) => seasonYear(h.season)));
  const auto = {
    honours: () => honours.length,
    seasons: () => latest - (site.founded ?? latest) + 1, // validation guarantees `founded` when this is used
    people: () => people.filter((p) => seasonYear(p.season) === peopleLatest).length,
  };
  return (site.stats ?? []).map((s) => ({ label: s.label, value: 'auto' in s ? String(auto[s.auto]()) : s.value }));
}
