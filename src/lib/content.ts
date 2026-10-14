// The ONLY module pages use to read content (SPEC constraint 9).
// To move content to an API or CMS later, change this file and content.config.ts — not the pages.

import { getCollection, getEntry } from 'astro:content';

const DEFAULT_LABELS = {
  nav: {
    home: 'Home',
    about: 'About',
    people: 'People',
    honours: 'Honours',
    news: 'News',
    contact: 'Contact',
  },
};

export type Labels = typeof DEFAULT_LABELS;

export async function getSite() {
  const entry = await getEntry('site', 'site');
  if (!entry) throw new Error('site.yaml was not loaded'); // unreachable: validation fails the build first
  const site = entry.data;
  const labels: Labels = { nav: { ...DEFAULT_LABELS.nav, ...site.labels?.nav } };
  const modules = { honours: site.modules?.honours ?? true, news: site.modules?.news ?? true };
  return { ...site, labels, modules };
}

export const getPeople = () => getCollection('people');
export const getHonours = () => getCollection('honours');
export const getNews = async () =>
  (await getCollection('news')).sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
export const getAboutPage = () => getEntry('pages', 'about');
