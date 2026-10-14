// The ONLY module pages use to read content (SPEC constraint 9).
// To move content to an API or CMS later, change this file and content.config.ts — not the pages.

import { getCollection, getEntry } from 'astro:content';
import { seasonYear } from './content-schema';
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
