# Durham University Ultimate Frisbee Club — website

**English** | [中文](README.zh-CN.md)

[![CI](https://github.com/alvinz26/team-site-template/actions/workflows/ci.yml/badge.svg)](https://github.com/alvinz26/team-site-template/actions/workflows/ci.yml)

Live site: **https://alvinz26.github.io/team-site-template/**

## What this is

The website of Durham University Ultimate Frisbee Club (DUF), built as a **reusable template**
that any sports team or student society can copy.

- **No code needed to update it** — everything you see on the site lives in the [`content/`](content/) folder as simple text files.
- **Pages:** home, about, people (committee, captains, coaches), honours (results, filters and a player leaderboard), news and contact.
- **Static and free:** plain HTML pages hosted on GitHub Pages — no server, database, logins, tracking or cookies.
- **Safety net:** if a file is filled in wrongly, the site is not updated and you get a plain-English message saying which file, which entry and which field to fix.
- Works on phones, and is checked for basic accessibility (alt text, colour contrast, keyboard use).

## Editing the content

Everything editable is in [`content/`](content/):

| File | What it controls |
|---|---|
| [`content/site.yaml`](content/site.yaml) | Club name, colours, logo, social links, home-page numbers, honours filters, and switching modules on/off |
| [`content/people.yaml`](content/people.yaml) | Committee, captains and coaches (one block per person per season) |
| [`content/honours.yaml`](content/honours.yaml) | Results: season, competition, team, medal, tags and squad |
| [`content/news/`](content/news/) | One file per news post |
| [`content/pages/about.md`](content/pages/about.md) · [`join.md`](content/pages/join.md) | The About page and the home-page "New to ultimate?" section |
| [`content/images/`](content/images/) | Logo, photos and covers |

**On the GitHub website** (no software needed):

1. Open the file and click the ✏️ (Edit) button.
2. Make your change, then click **Commit changes…**.
3. GitHub will offer to **create a new branch and start a pull request** — keep that option and click **Propose changes**, then **Create pull request**.
4. Wait for the automatic check to show a **green ✓** (usually a few minutes), then click **Squash and merge**.

The step-by-step guide (in Chinese) is [docs/content-guide.md](docs/content-guide.md); every field is described in [docs/data-model.md](docs/data-model.md).

## How long until changes appear

About **1–3 minutes** after a change is merged. Open the **Actions** tab to watch it: a yellow dot means
it is publishing, a green ✓ means it is live (refresh the page), a red ✗ means something needs fixing.

## When something goes wrong

- A red ✗ means the content check found a problem. **The live site stays on the last working version** — nothing breaks.
- Click the red ✗ → **Details**, and look for the block starting with `Content check failed`. It lists every problem like this:

  ```
  content/people.yaml → 2026/27 · Alex Smith (line 12)
    • role — is required but missing.
  ```

- Fix the file as described and save again. Every past version is kept by GitHub, so any change can be undone.

## Use this template for your own team

1. Click **Use this template → Create a new repository** at the top of this page, and give it a name.
2. In the new repository: **Settings → Pages → Source: GitHub Actions**.
3. Replace the files in `content/` with your team's details (start with `content/site.yaml`).
4. Your site appears at `https://<your-username>.github.io/<repository-name>/`. The address is worked out automatically — no code to change.

Different sports work too: the honours filters and medal types are set in `site.yaml`, and the honours or news sections can be switched off.

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
