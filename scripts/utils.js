import fs from 'node:fs';
import path from 'node:path';

import yaml from 'js-yaml';

// Dependency fields whose `workspace:` / `catalog:` specifiers must be resolved
// before publishing with npm.
const DEPENDENCY_FIELDS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];

// Manifest fields that pnpm/utoo hoist from `publishConfig` onto the published
// package at publish time. npm leaves `publishConfig` untouched apart from its
// own keys (registry/access/tag/provenance), so we replicate the hoist here.
// (`access`/`tag` are intentionally absent — npm reads those from publishConfig
// directly and they are also passed on the CLI.)
const PUBLISH_CONFIG_OVERRIDE_FIELDS = [
  'bin',
  'main',
  'module',
  'exports',
  'types',
  'typings',
  'browser',
  'esnext',
  'es2015',
  'unpkg',
  'umd:main',
  'typesVersions',
  'cpu',
  'os',
];

// Valid npm package name (scoped or unscoped). Names that fail this are
// rejected before they reach a git command (release commit message) or an
// `npm publish` invocation — defence in depth against a malicious or
// malformed `name` field smuggling shell metacharacters or a typo'd package.
const NPM_NAME_RE = /^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;

/**
 * Whether `name` is a syntactically valid npm package name (scoped or unscoped,
 * 1-214 chars, lowercase, URL-safe).
 * @param {unknown} name
 * @returns {boolean}
 */
export function isValidNpmPackageName(name) {
  return typeof name === 'string' && name.length > 0 && name.length <= 214 && NPM_NAME_RE.test(name);
}

/**
 * Throw if `name` is not a valid npm package name. Used to reject a malicious or
 * typo'd `name` before it reaches a git command or `npm publish`.
 * @param {unknown} name
 */
export function assertValidNpmPackageName(name) {
  if (!isValidNpmPackageName(name)) {
    throw new Error(`Invalid npm package name: ${JSON.stringify(name)}`);
  }
}

function readWorkspaceConfig(baseDir) {
  const workspaceFile = path.join(baseDir, 'pnpm-workspace.yaml');

  if (!fs.existsSync(workspaceFile)) {
    throw new Error('pnpm-workspace.yaml not found');
  }

  return yaml.load(fs.readFileSync(workspaceFile, 'utf8')) || {};
}

// Walk every workspace package declared in pnpm-workspace.yaml
// (utoo consumes the same workspace manifest) and yield a lightweight record
// for each one, regardless of whether it is private.
function collectWorkspacePackages(baseDir) {
  const { packages = [] } = readWorkspaceConfig(baseDir);
  const collected = [];

  const pushPackage = (directory, folder, packageJsonPath) => {
    if (!fs.existsSync(packageJsonPath)) {
      return;
    }
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    collected.push({
      folder,
      directory,
      name: packageJson.name,
      private: packageJson.private,
      version: packageJson.version,
    });
  };

  for (const packagePattern of packages) {
    // Handle glob patterns like 'packages/*', 'tools/*', etc.
    if (packagePattern.endsWith('/*')) {
      const dirPath = packagePattern.slice(0, -2); // Remove '/*'
      const fullDir = path.join(baseDir, dirPath);

      if (fs.existsSync(fullDir)) {
        const folders = fs
          .readdirSync(fullDir)
          .filter((folder) => fs.statSync(path.join(fullDir, folder)).isDirectory());

        for (const folder of folders) {
          pushPackage(dirPath, folder, path.join(fullDir, folder, 'package.json'));
        }
      }
    } else {
      // Handle direct package paths like 'site'
      pushPackage(
        path.dirname(packagePattern) || '.',
        path.basename(packagePattern),
        path.join(baseDir, packagePattern, 'package.json'),
      );
    }
  }

  return collected;
}

// Get all publishable packages (those not explicitly marked as private).
export function getPublishablePackages(baseDir) {
  return collectWorkspacePackages(baseDir).filter((pkg) => !pkg.private);
}

// Build a `name -> version` map for every workspace package (including private
// ones) so `workspace:` protocol specifiers can be resolved to the concrete
// versions currently on disk.
export function getWorkspaceVersionMap(baseDir) {
  const versions = {};
  for (const pkg of collectWorkspacePackages(baseDir)) {
    if (pkg.name) {
      versions[pkg.name] = pkg.version;
    }
  }
  return versions;
}

// Read the pnpm/utoo catalogs: the default `catalog` table and any named
// `catalogs.<name>` tables.
export function getCatalogs(baseDir) {
  const config = readWorkspaceConfig(baseDir);
  return {
    default: config.catalog || {},
    named: config.catalogs || {},
  };
}

function resolveWorkspaceSpec(name, spec, versionMap) {
  const version = versionMap[name];
  if (!version) {
    throw new Error(`Cannot resolve workspace dependency "${name}" (${spec}): no workspace package with that name`);
  }
  const range = spec.slice('workspace:'.length);
  // pnpm semantics: `workspace:*` (and bare `workspace:`) pin the exact version,
  // `workspace:^` / `workspace:~` add the matching prefix, and an explicit range
  // such as `workspace:^1.2.3` is published with the `workspace:` prefix removed.
  if (range === '' || range === '*') {
    return version;
  }
  if (range === '^' || range === '~') {
    return `${range}${version}`;
  }
  return range;
}

function resolveCatalogSpec(name, spec, catalogs) {
  const catalogName = spec.slice('catalog:'.length);
  const table = catalogName === '' ? catalogs.default : catalogs.named[catalogName];
  if (!table || table[name] === undefined) {
    const where = catalogName === '' ? 'default catalog' : `catalog "${catalogName}"`;
    throw new Error(`Cannot resolve catalog dependency "${name}" (${spec}): missing from ${where}`);
  }
  return table[name];
}

// Replace pnpm/utoo `workspace:` and `catalog:` protocol specifiers in a package
// manifest with concrete version ranges. npm understands neither protocol and
// would otherwise publish the literal `workspace:*` / `catalog:` strings,
// producing uninstallable packages. This mirrors what `pnpm publish` did for us
// before the utoo migration. Returns a new manifest object; the input is not
// mutated.
export function resolveWorkspaceProtocols(manifest, { versionMap, catalogs }) {
  const resolved = { ...manifest };

  for (const field of DEPENDENCY_FIELDS) {
    const deps = manifest[field];
    if (!deps) {
      continue;
    }

    const next = { ...deps };
    for (const [name, spec] of Object.entries(deps)) {
      if (typeof spec !== 'string') {
        continue;
      }
      if (spec.startsWith('workspace:')) {
        next[name] = resolveWorkspaceSpec(name, spec, versionMap);
      } else if (spec.startsWith('catalog:')) {
        next[name] = resolveCatalogSpec(name, spec, catalogs);
      }
    }
    resolved[field] = next;
  }

  return resolved;
}

// Apply pnpm/utoo-style `publishConfig` overrides to a manifest: for the
// publish-relevant fields (see PUBLISH_CONFIG_OVERRIDE_FIELDS), replace the
// top-level value with the one declared under `publishConfig`. These egg
// packages ship a dev-time root `exports` pointing at TypeScript source and a
// `publishConfig.exports` pointing at the compiled `dist/` output; pnpm hoisted
// the latter on publish. Plain `npm publish` does not, so without this the
// published `exports` would point at `src/` files that are not even in the
// tarball (`files: ["dist"]`), breaking every consumer. `publishConfig` itself
// is left in place (npm still reads access/tag/registry from it). Returns a new
// manifest object; the input is not mutated.
export function applyPublishConfigOverrides(manifest) {
  const { publishConfig } = manifest;
  if (!publishConfig) {
    return manifest;
  }

  const overridden = { ...manifest };
  for (const field of PUBLISH_CONFIG_OVERRIDE_FIELDS) {
    if (publishConfig[field] !== undefined) {
      overridden[field] = publishConfig[field];
    }
  }
  return overridden;
}
