import { debuglog } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { runScript } from 'runscript';
import { readJSON, exists } from 'utility';
import { importResolve } from '@eggjs/utils';

const debug = debuglog('egg-bin/scripts/postinstall');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.dirname(__dirname);

async function main() {
  // node postintall.js </path/to/egg-ts-helper/dist/bin> <framework-package-name>
  const etsBinFile =
    process.argv[2] ||
    importResolve('egg-ts-helper/dist/bin.js', {
      paths: [rootDir],
    });
  const frameworkPackageName = process.argv[3] || 'egg';

  // try to use INIT_CWD env https://docs.npmjs.com/cli/v9/commands/npm-run-script
  // npm_rootpath is npminstall
  const npmRunRoot = process.env.INIT_CWD || process.env.npm_rootpath;

  debug('process.argv: %o', process.argv);
  debug('process.env.INIT_CWD: %o', process.env.INIT_CWD);
  debug('process.env.npm_rootpath: %o', process.env.npm_rootpath);
  debug('etsBinFile: %o', etsBinFile);
  debug('frameworkPackageName: %o', frameworkPackageName);
  debug('npmRunRoot: %o', npmRunRoot);

  if (npmRunRoot) {
    const pkgFile = path.join(npmRunRoot, 'package.json');
    const pkgFileExists = await exists(pkgFile);
    debug('pkgFile: %o exists: %o', pkgFile, pkgFileExists);
    if (pkgFileExists) {
      const pkg = await readJSON(pkgFile);
      // should set pkg.egg.declarations = true or pkg.egg.typescript = true
      if (!pkg.egg?.typescript && !pkg.egg?.declarations) return;
      // ignore eggModule and framework
      // framework package.json:
      // "egg": {
      //   "isFramework": true,
      //   "typescript": true
      // }
      if (pkg.eggModule) return;
      if (pkg.egg.isFramework) return;
      // ignore when the current app don't has a framework dependencies
      if (!pkg.dependencies || !pkg.dependencies[frameworkPackageName]) return;
      // set ETS_CWD
      process.env.ETS_CWD = npmRunRoot;
      // https://github.com/eggjs/egg-ts-helper/pull/104
      process.env.ETS_SCRIPT_FRAMEWORK = frameworkPackageName;
      console.log(
        '[@eggjs/bin/postinstall] run %s on %s',
        etsBinFile,
        npmRunRoot
      );
      await runScript(`node "${etsBinFile}"`);
    }
  }
}

void main();
