// After every build, tidy every published photo:
//   - remove hidden metadata (EXIF, GPS location, camera model, XMP, IPTC) — D53;
//   - shrink anything larger than 2400 px on its longest side — D58.
// Astro strips metadata from the resized copies it makes, but it also publishes the original
// upload unchanged: a phone photo would reveal where it was taken and could weigh 5–10 MB.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const PHOTO = /\.(jpe?g|png|webp|avif|tiff?)$/i;
const MAX_SIDE = 2400;

async function* walk(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (PHOTO.test(entry.name)) yield full;
  }
}

export default function stripImageMetadata() {
  return {
    name: 'strip-image-metadata',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        let cleaned = 0;
        let shrunk = 0;
        for await (const file of walk(fileURLToPath(dir))) {
          const input = await fs.readFile(file);
          const meta = await sharp(input).metadata();
          const hasMetadata = Boolean(meta.exif || meta.xmp || meta.iptc);
          const tooBig = Math.max(meta.width ?? 0, meta.height ?? 0) > MAX_SIDE;
          if (!hasMetadata && !tooBig) continue;
          // rotate() bakes the EXIF orientation into the pixels so the photo stays the right way up;
          // sharp writes no metadata unless asked to.
          const output = await sharp(input)
            .rotate()
            .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true })
            .toFormat(meta.format, { quality: 90 })
            .toBuffer();
          await fs.writeFile(file, output);
          if (hasMetadata) cleaned++;
          if (tooBig) shrunk++;
        }
        if (cleaned > 0) logger.info(`Removed hidden metadata (e.g. GPS location) from ${cleaned} image(s).`);
        if (shrunk > 0) logger.info(`Shrank ${shrunk} published image(s) to at most ${MAX_SIDE} px.`);
      },
    },
  };
}
