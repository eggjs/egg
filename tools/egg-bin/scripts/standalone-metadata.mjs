import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { debuglog } from 'node:util';

const debug = debuglog('egg/bin/scripts/standalone-metadata');

async function main() {
  const options = JSON.parse(process.argv[2]);
  debug('standalone metadata options: %o', options);

  const require = createRequire(path.join(options.baseDir, 'package.json'));
  let resolved;
  try {
    resolved = require.resolve(options.framework);
  } catch {
    throw new Error(`--framework ${options.framework} cannot be resolved from ${options.baseDir}`);
  }

  const framework = await import(pathToFileURL(resolved).href);
  if (typeof framework.loadMetadata !== 'function') {
    throw new Error(
      `--framework ${options.framework} does not export loadMetadata; it is not a standalone bundle target`,
    );
  }

  const manifest = await framework.loadMetadata(options.appDir);
  await fs.writeFile(options.outputFile, JSON.stringify(manifest));
}

main().catch((err) => {
  console.error('[bundle] Standalone metadata generation failed:', err);
  process.exitCode = 1;
});
