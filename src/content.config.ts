// Astro content collections. Every collection is filled from content/ by the same
// validated snapshot (src/lib/content-validate.ts), so a broken file stops the build with
// a readable message instead of silently producing empty pages.

import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { defineCollection } from 'astro:content';
import type { Loader, LoaderContext } from 'astro/loaders';
import { honourSchema, newsSchema, pageSchema, personSchema, siteSchema } from './lib/content-schema';
import { CONTENT_DIR, loadContent, type Entry, type MarkdownEntry, type ValidContent } from './lib/content-validate';

/** Image paths are written from content/ (images/...); Astro resolves them from the entry's own file. */
function fromEntryFile(file: string, image: string | undefined): string | undefined {
  if (!image) return image;
  const relative = path.relative(path.dirname(file), path.join(CONTENT_DIR, image)).split(path.sep).join('/');
  return relative.startsWith('.') ? relative : `./${relative}`;
}

const rootRelative = (ctx: LoaderContext, file: string) =>
  path.relative(fileURLToPath(ctx.config.root), file).split(path.sep).join('/');

async function storeData(ctx: LoaderContext, entries: Entry<Record<string, unknown>>[]) {
  ctx.store.clear();
  for (const { id, file, data } of entries) {
    const parsed = await ctx.parseData({ id, data, filePath: file });
    ctx.store.set({ id, data: parsed, filePath: rootRelative(ctx, file), digest: ctx.generateDigest(data) });
  }
}

/** Markdown body images are written ![alt](images/...) like everywhere else; Astro wants them relative to the .md file. */
const bodyImagesFromEntryFile = (file: string, body: string) =>
  body.replace(/(!\[[^\]]*\]\(\s*<?)(images\/[^)\s>]+)/g, (_, start: string, image: string) => start + fromEntryFile(file, image));

async function storeMarkdown(ctx: LoaderContext, entries: MarkdownEntry<Record<string, unknown>>[]) {
  ctx.store.clear();
  for (const { id, file, data, body } of entries) {
    const parsed = await ctx.parseData({ id, data, filePath: file });
    const rendered = await ctx.renderMarkdown(bodyImagesFromEntryFile(file, body), { fileURL: pathToFileURL(file) });
    ctx.store.set({
      id,
      data: parsed,
      body,
      rendered,
      filePath: rootRelative(ctx, file),
      digest: ctx.generateDigest(body + JSON.stringify(data)),
      assetImports: rendered.metadata?.imagePaths,
    });
  }
}

/** A loader that takes its entries from the validated content snapshot. */
function contentLoader(name: string, load: (ctx: LoaderContext, content: ValidContent) => Promise<void>): Loader {
  return {
    name: `team-site-${name}`,
    load: async (ctx) => {
      await load(ctx, loadContent());
      ctx.watcher?.add(CONTENT_DIR);
    },
  };
}

const site = defineCollection({
  loader: contentLoader('site', (ctx, { site }) => {
    const file = path.join(CONTENT_DIR, 'site.yaml');
    const data = {
      ...site,
      logo: fromEntryFile(file, site.logo),
      hero: site.hero && { ...site.hero, image: fromEntryFile(file, site.hero.image) },
    };
    return storeData(ctx, [{ id: 'site', file, data }]);
  }),
  schema: ({ image }) => siteSchema(image()),
});

const people = defineCollection({
  loader: contentLoader('people', (ctx, { people }) =>
    storeData(ctx, people.map((e) => ({ ...e, data: { ...e.data, photo: fromEntryFile(e.file, e.data.photo) } }))),
  ),
  schema: ({ image }) => personSchema(image()),
});

const honours = defineCollection({
  loader: contentLoader('honours', (ctx, { honours }) =>
    storeData(ctx, honours.map((e) => ({ ...e, data: { ...e.data, photo: fromEntryFile(e.file, e.data.photo) } }))),
  ),
  schema: ({ image }) => honourSchema(image()),
});

const news = defineCollection({
  loader: contentLoader('news', (ctx, { news }) =>
    storeMarkdown(ctx, news.map((e) => ({ ...e, data: { ...e.data, cover: fromEntryFile(e.file, e.data.cover) } }))),
  ),
  schema: ({ image }) => newsSchema(image()),
});

const pages = defineCollection({
  loader: contentLoader('pages', (ctx, { about, join }) => storeMarkdown(ctx, join ? [about, join] : [about])),
  schema: pageSchema,
});

export const collections = { site, people, honours, news, pages };
