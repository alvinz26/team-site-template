// After every build, remove hidden metadata (EXIF, GPS location, camera model, XMP, IPTC)
// from every published photo. Astro strips it from the resized copies it makes, but it also
// publishes the original upload unchanged — a phone photo would reveal where it was taken (D53).

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const PHOTO = /\.(jpe?g|png|webp|avif|tiff?)$/i;

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
        for await (const file of walk(fileURLToPath(dir))) {
          const input = await fs.readFile(file);
          const meta = await sharp(input).metadata();
          if (!meta.exif && !meta.xmp && !meta.iptc) continue;
          // rotate() bakes the EXIF orientation into the pixels so the photo stays the right way up;
          // sharp writes no metadata unless asked to.
          const output = await sharp(input).rotate().toFormat(meta.format, { quality: 90 }).toBuffer();
          await fs.writeFile(file, output);
          cleaned++;
        }
        if (cleaned > 0) logger.info(`Removed hidden metadata (e.g. GPS location) from ${cleaned} image(s).`);
      },
    },
  };
}
