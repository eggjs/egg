import fs from 'node:fs';
import { join } from 'node:path';

import repos from './repo.json' with { type: 'json' };

const projectDir = import.meta.dirname;

const projects = Object.keys(repos);

const project = process.argv[2];

if (!projects.includes(project)) {
  console.error(`Project ${project} is not defined in repo.json`);
  process.exit(1);
}

const tgzPath = join(projectDir, '..');

const packages = [
  // tools
  ['@eggjs/scripts', 'tools/scripts'],
  ['@eggjs/bin', 'tools/egg-bin'],
  ['create-egg', 'tools/create-egg'],
  // packages
  ['egg', 'packages/egg'],
  ['@eggjs/tsconfig', 'packages/tsconfig'],
  ['@eggjs/cluster', 'packages/cluster'],
  ['@eggjs/cookies', 'packages/cookies'],
  ['@eggjs/core', 'packages/core'],
  ['@eggjs/errors', 'packages/errors'],
  ['@eggjs/extend2', 'packages/extend2'],
  ['@eggjs/koa-static-cache', 'packages/koa-static-cache'],
  ['@eggjs/koa', 'packages/koa'],
  ['@eggjs/path-matching', 'packages/path-matching'],
  ['@eggjs/router', 'packages/router'],
  ['@eggjs/supertest', 'packages/supertest'],
  ['@eggjs/utils', 'packages/utils'],
  // plugins
  ['@eggjs/mock', 'plugins/mock'],
  ['@eggjs/redis', 'plugins/redis'],
  ['@eggjs/tracer', 'plugins/tracer'],
  ['@eggjs/typebox-validate', 'plugins/typebox-validate'],
  ['@eggjs/development', 'plugins/development'],
  ['@eggjs/i18n', 'plugins/i18n'],
  ['@eggjs/jsonp', 'plugins/jsonp'],
  ['@eggjs/logrotator', 'plugins/logrotator'],
  ['@eggjs/multipart', 'plugins/multipart'],
  ['@eggjs/onerror', 'plugins/onerror'],
  ['@eggjs/schedule', 'plugins/schedule'],
  ['@eggjs/security', 'plugins/security'],
  ['@eggjs/session', 'plugins/session'],
  ['@eggjs/static', 'plugins/static'],
  ['@eggjs/view-nunjucks', 'plugins/view-nunjucks'],
  ['@eggjs/view', 'plugins/view'],
  ['@eggjs/watcher', 'plugins/watcher'],
  // tegg/core
  ['@eggjs/ajv-decorator', 'tegg/core/ajv-decorator'],
  ['@eggjs/aop-decorator', 'tegg/core/aop-decorator'],
  ['@eggjs/aop-runtime', 'tegg/core/aop-runtime'],
  ['@eggjs/background-task', 'tegg/core/background-task'],
  ['@eggjs/tegg-common-util', 'tegg/core/common-util'],
  ['@eggjs/controller-decorator', 'tegg/core/controller-decorator'],
  ['@eggjs/core-decorator', 'tegg/core/core-decorator'],
  ['@eggjs/dal-decorator', 'tegg/core/dal-decorator'],
  ['@eggjs/dal-runtime', 'tegg/core/dal-runtime'],
  ['@eggjs/dynamic-inject', 'tegg/core/dynamic-inject'],
  ['@eggjs/dynamic-inject-runtime', 'tegg/core/dynamic-inject-runtime'],
  ['@eggjs/eventbus-decorator', 'tegg/core/eventbus-decorator'],
  ['@eggjs/eventbus-runtime', 'tegg/core/eventbus-runtime'],
  ['@eggjs/lifecycle', 'tegg/core/lifecycle'],
  ['@eggjs/tegg-loader', 'tegg/core/loader'],
  ['@eggjs/metadata', 'tegg/core/metadata'],
  ['@eggjs/orm-decorator', 'tegg/core/orm-decorator'],
  ['@eggjs/tegg-runtime', 'tegg/core/runtime'],
  ['@eggjs/schedule-decorator', 'tegg/core/schedule-decorator'],
  ['@eggjs/standalone-decorator', 'tegg/core/standalone-decorator'],
  ['@eggjs/tegg', 'tegg/core/tegg'],
  ['@eggjs/module-test-util', 'tegg/core/test-util'],
  ['@eggjs/transaction-decorator', 'tegg/core/transaction-decorator'],
  ['@eggjs/tegg-types', 'tegg/core/types'],
  // tegg/plugin
  ['@eggjs/ajv-plugin', 'tegg/plugin/ajv'],
  ['@eggjs/aop-plugin', 'tegg/plugin/aop'],
  ['@eggjs/module-common', 'tegg/plugin/common'],
  ['@eggjs/tegg-config', 'tegg/plugin/config'],
  ['@eggjs/controller-plugin', 'tegg/plugin/controller'],
  ['@eggjs/dal-plugin', 'tegg/plugin/dal'],
  ['@eggjs/eventbus-plugin', 'tegg/plugin/eventbus'],
  ['@eggjs/orm-plugin', 'tegg/plugin/orm'],
  ['@eggjs/schedule-plugin', 'tegg/plugin/schedule'],
  ['@eggjs/tegg-plugin', 'tegg/plugin/tegg'],
  // tegg/standalone
  ['@eggjs/standalone', 'tegg/standalone/standalone'],
];

const overrides: Record<string, string> = {};

for (const [name, path] of packages) {
  const version = JSON.parse(fs.readFileSync(join(tgzPath, path, 'package.json'), 'utf8')).version;
  const filename = `${name.replace('@', '').replace('/', '-')}-${version}.tgz`;
  overrides[name] = `file:${tgzPath}/${filename}`;
}

async function patchCnpmcore() {
  const packageJsonPath = join(projectDir, 'cnpmcore', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  // Add overrides with tgz files
  packageJson.overrides = {
    ...packageJson.overrides,
    ...overrides,
  };

  for (const name in packageJson.dependencies) {
    const override = overrides[name];
    if (override) {
      packageJson.dependencies[name] = override;
    }
  }
  for (const name in packageJson.devDependencies) {
    const override = overrides[name];
    if (override) {
      packageJson.devDependencies[name] = override;
    }
  }

  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
}

switch (project) {
  case 'cnpmcore':
    await patchCnpmcore();
    break;
  default:
    console.error(`Project ${project} is not supported`);
    process.exit(1);
}
