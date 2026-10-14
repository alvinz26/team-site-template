# Team Site Template

**English** | [中文](README.zh-CN.md)

[![CI](https://github.com/alvinz26/team-site-template/actions/workflows/ci.yml/badge.svg)](https://github.com/alvinz26/team-site-template/actions/workflows/ci.yml)

A static, zero-backend website template for sports teams and student clubs — designed and built by **Tao**.

- **Live demo** (fictional club): https://alvinz26.github.io/team-site-template/
- **In use:** [Durham University Ultimate Frisbee Club](https://durham-ultimate-frisbee.github.io/website/) — source in [Durham-ultimate-frisbee/website](https://github.com/Durham-ultimate-frisbee/website)

## What this is

A website that **people who don't write code can keep up to date**: everything on the site lives in the
[`content/`](content/) folder as simple text files, and the code never needs touching.

- **Pages:** home, about, people (committee, captains, coaches), honours (results, filters and a player leaderboard), news and contact.
- **Static and free:** plain HTML hosted on GitHub Pages — no server, database, logins, tracking or cookies.
- **Safety net:** if a file is filled in wrongly, the site is not updated and you get a plain-English message saying which file, which entry and which field to fix.
- **Any team:** colours, honours filters and medal types are settings; the honours and news sections can be switched off; a custom domain is one line.
- Works on phones; checked for basic accessibility (alt text, colour contrast, keyboard use); photo location data is removed automatically.

## Editing the content

Everything editable is in [`content/`](content/):

| File | What it controls |
|---|---|
| [`content/site.yaml`](content/site.yaml) | Club name, colours, logo, social links, home-page numbers, honours filters, modules on/off, custom domain |
| [`content/people.yaml`](content/people.yaml) | Committee, captains and coaches (one block per person per season) |
| [`content/honours.yaml`](content/honours.yaml) | Results: season, competition, team, medal, tags and squad |
| [`content/news/`](content/news/) | One file per news post |
| [`content/pages/about.md`](content/pages/about.md) · [`join.md`](content/pages/join.md) | The About page and the home-page "New to ultimate?" section |
| [`content/images/`](content/images/) | Logo, photos and covers |

On the GitHub website: open a file → ✏️ **Edit** → **Commit changes…**. If the repository protects its main branch,
choose **Create a new branch and start a pull request**, wait for the green ✓, then **Squash and merge**.

The step-by-step guide (in Chinese) is [docs/content-guide.md](docs/content-guide.md); every field is described in [docs/data-model.md](docs/data-model.md).

## How long until changes appear

Usually **a few minutes** after a change reaches the main branch. The **Actions** tab shows progress:
yellow = publishing, green ✓ = live (refresh the page), red ✗ = something needs fixing.

## When something goes wrong

- A red ✗ means the content check found a problem. **The live site stays on the last working version.**
- Click the red ✗ → **Details** and look for the block starting with `Content check failed`, e.g.

  ```
  content/people.yaml → 2026/27 · Alex Smith (line 12)
    • role — is required but missing.
  ```

- Fix the file as described and save again. GitHub keeps every past version, so any change can be undone.

## Use this template for your own team

1. Click **Fork** at the top of this page (the fork keeps a link back to this project).
2. In your copy: open the **Actions** tab and enable workflows, then **Settings → Pages → Source: GitHub Actions**.
3. Replace the files in `content/` with your team's details, starting with `content/site.yaml`.
4. Your site appears at `https://<owner>.github.io/<repository>/` — worked out automatically. With your own domain, add `domain:` to `site.yaml` and the same domain under **Settings → Pages**.

## Author and licence

Designed and built by **Tao** ([@alvinz26](https://github.com/alvinz26)): requirements, architecture,
design decisions and delivery.

Released under the [MIT licence](LICENSE): you may use and adapt it, provided the copyright notice is kept.

## For developers

```bash
npm install
npm run dev     # local preview at http://localhost:4321
npm test        # 65 acceptance tests (builds the site against fixture content)
npm run check   # TypeScript / Astro type check
```

- Built with [Astro](https://astro.build) 7; content is validated in [`src/lib/content-validate.ts`](src/lib/content-validate.ts) and read only through [`src/lib/content.ts`](src/lib/content.ts).
- The original brief is [CLAUDE.md](CLAUDE.md) and every design decision is recorded in [DECISIONS.md](DECISIONS.md).
- Tests build the site from a fictional club in [`tests/fixtures/content/`](tests/fixtures/content/), so changing the real content never breaks them.
