// @ts-check
import { defineConfig } from 'astro/config';

/**
 * GitHub Pages address, worked out from the repository name (DECISIONS.md D1).
 * GitHub Actions sets GITHUB_REPOSITORY to "owner/repo", so a copy of this template
 * under any name deploys correctly without editing code:
 *   owner/team-site      → https://owner.github.io/team-site/
 *   owner/owner.github.io → https://owner.github.io/
 * Local builds (no GITHUB_REPOSITORY) are served from "/".
 */
function githubPages() {
  const repo = process.env.GITHUB_REPOSITORY;
  if (!repo) return { base: '/' };
  const [owner, name] = repo.split('/');
  const site = `https://${owner.toLowerCase()}.github.io`;
  const isUserSite = name.toLowerCase() === `${owner.toLowerCase()}.github.io`;
  return { site, base: isUserSite ? '/' : `/${name}` };
}

export default defineConfig({
  ...githubPages(),
});
