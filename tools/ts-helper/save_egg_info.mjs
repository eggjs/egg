import path from 'node:path';
import fs from 'node:fs/promises';
import { getLoader } from '@eggjs/utils';

// node save_egg_info.mjs baseDir frameworkPath saveEggInfoPath

const [ baseDir, frameworkPath, saveEggInfoPath ] = process.argv.slice(2);

async function main() {
  console.warn('[egg-ts-helper] Save egg info, baseDir: %s, frameworkPath: %s', baseDir, frameworkPath);
  const startTime = Date.now();
  const loader = await getLoader({
    framework: frameworkPath,
    baseDir,
  });
  // console.log(loader);

  try {
    await loader.loadPlugin();
  } catch (e) {
    console.warn('[egg-ts-helper] WARN loader.loadPlugin() error: %s, baseDir: %s, frameworkPath: %s',
      e, baseDir, frameworkPath);
    // do nothing
  }

  try {
    await loader.loadConfig();
  } catch (e) {
    console.warn('[egg-ts-helper] WARN loader.loadConfig() error: %s, baseDir: %s, frameworkPath: %s',
      e, baseDir, frameworkPath);
    // do nothing
  }

  const eggInfo = {};
  eggInfo.plugins = loader.allPlugins;
  eggInfo.config = loader.config;
  eggInfo.eggPaths = loader.eggPaths;
  eggInfo.timing = Date.now() - startTime;
  console.warn('[egg-ts-helper] plugins: %j', Object.keys(eggInfo.plugins));
  await fs.mkdir(path.dirname(saveEggInfoPath), { recursive: true });
  await fs.writeFile(saveEggInfoPath, JSON.stringify(eggInfo, null, 2));
}

void main();
