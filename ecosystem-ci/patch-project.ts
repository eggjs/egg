import fs from 'node:fs';
import { glob } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';

import yaml from 'js-yaml';

import repos from './repo.json' with { type: 'json' };

const projectDir = import.meta.dirname;
const rootDir = join(projectDir, '..');
const tgzPath = rootDir;

const projects = Object.keys(repos);

const project = process.argv[2];

if (!projects.includes(project)) {
  console.error(`Project ${project} is not defined in repo.json`);
  process.exit(1);
}

// Read pnpm-workspace.yaml to get workspace patterns
const workspaceConfig = yaml.load(fs.readFileSync(join(rootDir, 'pnpm-workspace.yaml'), 'utf8')) as {
  packages: string[];
};

// Use glob to find all package directories dynamically
async function discoverPackages(): Promise<[string, string][]> {
  const packages: [string, string][] = [];

  for (const pattern of workspaceConfig.packages) {
    // Convert pnpm patterns (e.g., 'packages/*') to glob patterns for package.json
    const globPattern = `${pattern}/package.json`;

    for await (const entry of glob(globPattern, { cwd: rootDir })) {
      const pkgJsonPath = join(rootDir, entry);
      try {
        const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));

        // Skip private packages and packages without names
        if (pkgJson.private || !pkgJson.name) continue;

        const relativePath = dirname(relative(rootDir, pkgJsonPath));
        packages.push([pkgJson.name, relativePath]);
      } catch {
        // Skip if package.json is invalid or cannot be read
        console.warn(`Warning: Could not read ${pkgJsonPath}`);
      }
    }
  }

  return packages;
}

async function buildOverrides(): Promise<Record<string, string>> {
  const packages = await discoverPackages();
  const overrides: Record<string, string> = {};

  for (const [name, path] of packages) {
    const version = JSON.parse(fs.readFileSync(join(tgzPath, path, 'package.json'), 'utf8')).version;
    const filename = `${name.replace('@', '').replace('/', '-')}-${version}.tgz`;
    overrides[name] = `file:${tgzPath}/${path}/${filename}`;
  }

  return overrides;
}

async function patchPackageJSON(filePath: string, overrides: Record<string, string>): Promise<void> {
  const packageJson = JSON.parse(fs.readFileSync(filePath, 'utf8'));
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

  const packageJsonString = JSON.stringify(packageJson, null, 2) + '\n';
  console.log(packageJsonString);
  fs.writeFileSync(filePath, packageJsonString);
}

async function patchCnpmcore(overrides: Record<string, string>): Promise<void> {
  const packageJsonPath = join(projectDir, 'cnpmcore', 'package.json');
  await patchPackageJSON(packageJsonPath, overrides);
}

async function patchExamples(overrides: Record<string, string>): Promise<void> {
  // https://github.com/eggjs/examples/tree/master/hello-tegg
  let packageJsonPath = join(projectDir, 'examples', 'hello-tegg', 'package.json');
  await patchPackageJSON(packageJsonPath, overrides);

  // https://github.com/eggjs/examples/blob/master/helloworld/package.json
  packageJsonPath = join(projectDir, 'examples', 'helloworld', 'package.json');
  await patchPackageJSON(packageJsonPath, overrides);
}

async function main(): Promise<void> {
  const overrides = await buildOverrides();

  switch (project) {
    case 'cnpmcore':
      await patchCnpmcore(overrides);
      break;
    case 'examples':
      await patchExamples(overrides);
      break;
    default:
      console.error(`Project ${project} is not supported`);
      process.exit(1);
  }
}

main();
