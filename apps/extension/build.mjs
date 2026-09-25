import { build, context } from 'esbuild';
import { copyFile, mkdir } from 'node:fs/promises';

const watch = process.argv.includes('--watch');
const outdir = 'dist';

const targets = [
  { entryPoints: ['src/background.ts'], format: 'esm' },
  { entryPoints: ['src/content.ts'], format: 'iife' },
];

await mkdir(outdir, { recursive: true });
await copyFile('manifest.json', `${outdir}/manifest.json`);

for (const target of targets) {
  const options = { ...target, bundle: true, outdir, target: 'chrome120', sourcemap: watch, logLevel: 'info' };
  if (watch) await (await context(options)).watch();
  else await build(options);
}
