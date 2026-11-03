import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';

/** Writes the built file list, and a hash of the files, into dist/sw.js. */
const precache = {
  name: 'precache',
  hooks: {
    'astro:build:done': async ({ dir }) => {
      const root = fileURLToPath(dir);
      const files = (await readdir(root, { recursive: true, withFileTypes: true }))
        .filter((f) => f.isFile() && f.name !== 'sw.js')
        .map((f) => relative(root, join(f.parentPath, f.name)).split(sep).join('/'))
        .sort();
      const hash = createHash('sha256');
      for (const file of files) hash.update(file).update(await readFile(join(root, file)));
      const urls = files.map((f) => '/' + f.replace(/(^|\/)index\.html$/, '$1'));
      const sw = join(root, 'sw.js');
      const placeholder = "/*PRECACHE*/ { version: 'dev', urls: [] }";
      const source = await readFile(sw, 'utf8');
      if (!source.includes(placeholder)) throw new Error('sw.js lost its PRECACHE placeholder');
      const list = JSON.stringify({ version: hash.digest('hex').slice(0, 12), urls });
      await writeFile(sw, source.replace(placeholder, list));
    },
  },
};

export default defineConfig({
  site: 'https://marbot.ammar.id',
  // Inline CSS so nothing blocks the PanelBoot script: a slow CPU otherwise paints the placeholder city first.
  build: { inlineStylesheets: 'always' },
  integrations: [precache],
});
