// @ts-check
import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'astro/config';
import { parse } from 'yaml';
import stripImageMetadata from './src/integrations/strip-image-metadata.mjs';

/** Optional `domain` from content/site.yaml (a club that bought its own address). Validation happens later, in the content check. */
function customDomain() {
  try {
    const file = path.join(path.resolve(process.env.CONTENT_DIR ?? 'content'), 'site.yaml');
    const domain = parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''))?.domain;
    return typeof domain === 'string' && domain.trim() ? domain.trim() : undefined;
  } catch {
    return undefined; // a broken site.yaml is reported, readably, by the content check
  }
}

/**
 * Site address and base path (DECISIONS.md D1, D56):
 *   site.yaml has `domain: www.example.org` → https://www.example.org/  (served from the root)
 *   otherwise GitHub Pages, from GITHUB_REPOSITORY ("owner/repo", set by GitHub Actions):
 *     owner/team-site       → https://owner.github.io/team-site/
 *     owner/owner.github.io → https://owner.github.io/
 *   local builds (no GITHUB_REPOSITORY) are served from "/".
 */
function siteAddress() {
  const domain = customDomain();
  if (domain) return { site: `https://${domain}`, base: '/' };
  const repo = process.env.GITHUB_REPOSITORY;
  if (!repo) return { base: '/' };
  const [owner, name] = repo.split('/');
  const site = `https://${owner.toLowerCase()}.github.io`;
  const isUserSite = name.toLowerCase() === `${owner.toLowerCase()}.github.io`;
  return { site, base: isUserSite ? '/' : `/${name}` };
}

export default defineConfig({
  ...siteAddress(),
  // Test builds (tests/helpers/build.mjs) use their own cache and write to .test-work/,
  // so a running `astro dev` is never disturbed by `npm test` (D40, D43).
  ...(process.env.ASTRO_CACHE_DIR ? { cacheDir: process.env.ASTRO_CACHE_DIR } : {}),
  vite: { server: { watch: { ignored: ['**/.test-work/**'] } } },
  integrations: [stripImageMetadata()],
});
