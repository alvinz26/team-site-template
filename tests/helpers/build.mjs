// Test harness: builds the site against a throwaway copy of `content/`.
//
// Each call copies the real example content into a temp directory, lets the
// test mutate it, then runs `astro build` with CONTENT_DIR pointing at the copy.
// Builds run one at a time (see `npm test`) and always use --force so the
// content layer cache can never leak results between cases.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(fileURLToPath(import.meta.url), '../../..');
const ASTRO_BIN = path.join(ROOT, 'node_modules', 'astro', 'bin', 'astro.mjs');
const WORK_ROOT = path.join(ROOT, '.test-work'); // git-ignored; emptied by `npm test` (pretest)

/** Helpers handed to a test's `mutate` callback. Paths are relative to content/. */
function makeContentApi(dir) {
  const abs = (p) => path.join(dir, p);
  return {
    dir,
    read: (p) => fs.readFileSync(abs(p), 'utf8'),
    write: (p, text, { bom = false } = {}) =>
      fs.writeFileSync(abs(p), (bom ? '﻿' : '') + text, 'utf8'),
    remove: (p) => fs.rmSync(abs(p), { force: true, recursive: true }),
    /** Replace an exact snippet; throws if the snippet is not found so fixtures cannot silently rot. */
    replace(p, from, to) {
      const text = this.read(p);
      if (!text.includes(from)) throw new Error(`fixture snippet not found in ${p}: ${JSON.stringify(from)}`);
      this.write(p, text.replace(from, to));
    },
  };
}

/**
 * @param {object} [opts]
 * @param {(c: ReturnType<typeof makeContentApi>) => void} [opts.mutate]
 * @param {Record<string, string>} [opts.env] extra environment variables (e.g. GITHUB_REPOSITORY)
 * @returns {{ ok: boolean, output: string, dist: string, html: (page?: string) => string, files: () => string[] }}
 */
export function buildSite({ mutate, env = {} } = {}) {
  // Scratch space lives inside the project: Astro cannot move build output across drives
  // (EXDEV on Windows) and cannot process images from content outside the project root.
  fs.mkdirSync(WORK_ROOT, { recursive: true });
  const work = fs.mkdtempSync(path.join(WORK_ROOT, 'build-'));
  const contentDir = path.join(work, 'content');
  const dist = path.join(work, 'dist');
  fs.cpSync(path.join(ROOT, 'content'), contentDir, { recursive: true });
  // Normalise line endings so string fixtures behave the same on every OS.
  for (const f of fs.readdirSync(contentDir, { recursive: true })) {
    const p = path.join(contentDir, f);
    if (/\.(ya?ml|md)$/.test(p)) fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n'));
  }
  mutate?.(makeContentApi(contentDir));

  const baseEnv = { ...process.env };
  delete baseEnv.GITHUB_REPOSITORY; // local builds must not inherit CI's value unless a test sets it
  const res = spawnSync(process.execPath, [ASTRO_BIN, 'build', '--force', '--outDir', dist], {
    cwd: ROOT,
    env: { ...baseEnv, ASTRO_TELEMETRY_DISABLED: '1', NO_COLOR: '1', CONTENT_DIR: contentDir, ...env },
    encoding: 'utf8',
    timeout: 180_000,
  });
  // Strip ANSI colour codes in case a dependency ignores NO_COLOR.
  const output = `${res.stdout ?? ''}\n${res.stderr ?? ''}`.replace(/\x1b\[[0-9;]*m/g, '');

  return {
    ok: res.status === 0,
    output,
    dist,
    html: (page = 'index.html') => fs.readFileSync(path.join(dist, page), 'utf8'),
    files: () => fs.readdirSync(dist, { recursive: true }).map((f) => path.join(dist, f)),
  };
}

/** Assertion message that shows the build log, so a failing test explains itself. */
export const withLog = (msg, build) => `${msg}\n----- build output -----\n${build.output.slice(-4000)}`;
