import { debuglog } from 'node:util';
import path from 'node:path';
import assert from 'node:assert';
import { existsSync } from 'node:fs';
import { readJSONSync } from './utils.js';
import { importResolve } from './import.js';

const debug = debuglog('@eggjs/utils/framework');

const initCwd = process.cwd();

interface Options {
  baseDir: string;
  framework?: string;
}

/**
 * Find the framework directory, lookup order
 * - specify framework path
 * - get framework name from
 * - use egg by default
 * @param {Object} options - options
 * @param  {String} options.baseDir - the current directory of application
 * @param  {String} [options.framework] - the directory of framework
 * @return {String} frameworkPath
 */
export function getFrameworkPath(options: Options): string {
  const { framework, baseDir } = options;
  const pkgPath = path.join(baseDir, 'package.json');
  assert(existsSync(pkgPath), `${pkgPath} should exist`);
  const moduleDir = path.join(baseDir, 'node_modules');

  // 1. pass framework or customEgg
  if (framework) {
    // 1.1 framework is an absolute path
    // framework: path.join(baseDir, 'node_modules/${frameworkName}')
    if (path.isAbsolute(framework)) {
      assert(existsSync(framework), `${framework} should exist`);
      return framework;
    }
    // 1.2 framework is a npm package that required by application
    // framework: 'frameworkName'
    return assertAndReturn(framework, moduleDir);
  }

  const pkg = readJSONSync(pkgPath);
  // 2. framework is not specified
  // 2.1 use framework name from pkg.egg.framework
  if (pkg.egg?.framework) {
    return assertAndReturn(pkg.egg.framework, moduleDir);
  }

  // 2.2 use egg by default
  return assertAndReturn('egg', moduleDir);
}

function assertAndReturn(frameworkName: string, moduleDir: string) {
  const moduleDirs = new Set([
    moduleDir,
    // find framework from process.cwd, especially for test,
    // the application is in test/fixtures/app,
    // and framework is install in ${cwd}/node_modules
    path.join(process.cwd(), 'node_modules'),
    // prevent from mocking process.cwd
    path.join(initCwd, 'node_modules'),
  ]);
  try {
    // find framework from global, especially for monorepo
    let globalModuleDir;
    // if frameworkName is scoped package, like @ali/egg
    if (frameworkName.startsWith('@') && frameworkName.includes('/')) {
      globalModuleDir = path.join(
        importResolve(`${frameworkName}/package.json`),
        '../../..',
      );
    } else {
      globalModuleDir = path.join(
        importResolve(`${frameworkName}/package.json`),
        '../..',
      );
    }
    moduleDirs.add(globalModuleDir);
  } catch (err) {
    // ignore
    debug('importResolve %s on %s error: %s', frameworkName, moduleDir, err);
  }
  for (const moduleDir of moduleDirs) {
    const frameworkPath = path.join(moduleDir, frameworkName);
    if (existsSync(frameworkPath)) return frameworkPath;
  }
  throw new Error(`${frameworkName} is not found in ${Array.from(moduleDirs)}`);
}
