// Shape of every content file (see docs/data-model.md).
//
// Each factory takes the schema to use for image fields, so the same shape serves two jobs:
//   - our own pre-check (content-validate.ts) passes a "local file that exists" validator;
//   - Astro's collections (content.config.ts) pass Astro's `image()` helper so images get optimised.
// Rules that need another file (e.g. `group` must be one of site.yaml → people.groups)
// are checked in content-validate.ts, so here those fields are plain strings.

import { z } from 'astro/zod';
import { DEFAULT_LABELS } from './labels';

type ImageField = z.ZodType<unknown, unknown>;

export const SOCIAL_PLATFORMS = ['instagram', 'facebook', 'x', 'tiktok', 'youtube', 'whatsapp', 'website'] as const;
export const AUTO_STATS = ['people', 'honours', 'seasons'] as const;

/** Short identifier used to link files together (group keys, result keys, facet keys). */
const key = z.string().regex(/^[a-z0-9-]+$/, 'use only lowercase letters, numbers and "-"');
const text = z.string().trim().min(1, 'cannot be empty');
const hexColour = z.string().regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'must be a colour like "#0f5c6e"');
const webUrl = z.string().regex(/^https?:\/\/\S+$/, 'must be a web address starting with https://');

/** A season: free text that contains a 4-digit year, e.g. 2026/27. YAML may read `2026` as a number. */
export const season = z
  .union([z.string(), z.number()])
  .transform((v) => String(v).trim())
  .refine((v) => /\d{4}/.test(v), 'must contain a 4-digit year, e.g. 2026/27');

/** First 4-digit year in a season string, used for sorting and "latest season". */
export const seasonYear = (s: string) => Number(s.match(/\d{4}/)?.[0] ?? 0);

/** Interface text overrides, generated from DEFAULT_LABELS: every key optional, unknown keys rejected. */
export const labelsSchema = z.strictObject(
  Object.fromEntries(
    Object.entries(DEFAULT_LABELS).map(([section, keys]) => [
      section,
      z.strictObject(Object.fromEntries(Object.keys(keys).map((k) => [k, text.optional()]))).optional(),
    ]),
  ) as { [S in keyof typeof DEFAULT_LABELS]: z.ZodOptional<z.ZodObject<{ [K in keyof (typeof DEFAULT_LABELS)[S]]: z.ZodOptional<z.ZodString> }>> },
);

export const siteSchema = <I extends ImageField>(img: I) =>
  z.strictObject({
    name: text,
    shortName: text,
    tagline: text,
    org: text.optional(),
    founded: z.number().int().min(1800).max(2200).optional(),
    description: text,
    notice: text.optional(),
    logo: img.optional(),
    colors: z.strictObject({ primary: hexColour, accent: hexColour }),
    email: z.email('must be an email address like hello@example.com').optional(),
    socials: z.array(z.strictObject({ platform: z.enum(SOCIAL_PLATFORMS), url: webUrl })).optional(),
    hero: z.strictObject({ image: img, alt: text }).optional(),
    stats: z
      .array(
        z.union([
          z.strictObject({ label: text, value: z.union([z.string(), z.number()]).transform(String) }),
          z.strictObject({ label: text, auto: z.enum(AUTO_STATS) }),
        ]),
      )
      .optional(),
    modules: z
      .strictObject({ honours: z.boolean().optional(), news: z.boolean().optional() })
      .optional(),
    people: z.strictObject({
      groups: z.array(z.strictObject({ key, label: text })).min(1, 'needs at least one group'),
    }),
    honours: z
      .strictObject({
        facets: z.array(z.strictObject({ key, label: text, options: z.array(text).min(1) })),
        results: z
          .array(z.strictObject({ key, label: text, emoji: z.string().optional(), rank: z.number().int().min(1) }))
          .min(1, 'needs at least one result'),
        aliases: z.record(text, z.array(text)).optional(),
      })
      .optional(),
    labels: labelsSchema.optional(),
  });

export const personSchema = <I extends ImageField>(img: I) =>
  z.strictObject({
    name: text,
    role: text,
    group: text,
    season,
    photo: img.optional(),
    bio: text.optional(),
    order: z.number().int().optional(),
  });

export const honourSchema = <I extends ImageField>(img: I) =>
  z.strictObject({
    season,
    competition: text,
    team: text,
    result: text,
    tags: z.record(z.string(), text).optional(),
    captains: z.array(text).optional(),
    roster: z.array(text).optional(),
    photo: img.optional(),
    links: z.array(z.strictObject({ label: text, url: webUrl })).optional(),
  });

export const newsSchema = <I extends ImageField>(img: I) =>
  z.strictObject({
    title: text,
    date: z.coerce.date({ error: 'must be a date written as YYYY-MM-DD' }),
    summary: text,
    cover: img.optional(),
  });

// The about page has no frontmatter fields.
export const pageSchema = z.strictObject({});
