// Default interface text. Teams override any of these in site.yaml → labels
// (docs/data-model.md §1.8). The schema in content-schema.ts is generated from this
// object, so a key only needs adding here.

export const DEFAULT_LABELS = {
  nav: {
    home: 'Home',
    about: 'About',
    people: 'People',
    honours: 'Honours',
    news: 'News',
    contact: 'Contact',
  },
  home: {
    joinButton: 'Come to training',
    aboutButton: 'About us',
    joinTitle: 'New to ultimate?',
    newsTitle: 'Latest news',
    allNews: 'All news',
    seeEveryone: 'See everyone',
  },
  common: {
    skipToContent: 'Skip to content',
    menu: 'Menu',
  },
  contact: {
    email: 'Email',
    socials: 'Follow us',
    none: 'Contact details coming soon.',
  },
  news: {
    empty: 'No news yet.',
  },
  people: {
    empty: 'Coming soon.',
  },
};

export type Labels = typeof DEFAULT_LABELS;
type Overrides = { [S in keyof Labels]?: { [K in keyof Labels[S]]?: string } };

export function mergeLabels(overrides: Overrides | undefined): Labels {
  const out = structuredClone(DEFAULT_LABELS);
  for (const [section, values] of Object.entries(overrides ?? {})) {
    Object.assign(out[section as keyof Labels], values);
  }
  return out;
}
