/**
 * Generate a snapshot entry file for an egg application.
 *
 * Scans the egg app (plugins, framework, app code) to discover all
 * dynamically-loaded files, then generates a single entry file that:
 * 1. Statically imports every discovered module
 * 2. Builds a module registry (filepath -> module)
 * 3. Sets globalThis.__snapshotModuleRegistry for importModule() interception
 * 4. Calls startEgg() to initialize the app
 *
 * Usage:
 *   node generate-snapshot-entry.mjs '{"baseDir":"...","framework":"...","env":"prod"}'
 *
 * Output:
 *   <baseDir>/dist/snapshot-entry.mjs
 *
 * This script has NO external dependencies - only Node.js built-ins.
 */

import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { debuglog } from 'node:util';

const debug = debuglog('egg/scripts/generate-snapshot-entry');

const LOADABLE_EXTENSIONS = ['.ts', '.js', '.mjs', '.cjs'];
const EXTEND_NAMES = ['application', 'agent', 'request', 'response', 'context', 'helper'];
const CONFIG_NAMES = ['config.default', 'config.prod', 'config.local', 'config.unittest', 'plugin', 'plugin.default'];

/**
 * Read a JSON file synchronously.
 */
function readJSON(filepath) {
  return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
}

/**
 * Resolve a package, returning undefined if not found.
 */
function tryResolvePackage(name, paths) {
  const require = createRequire(import.meta.url);
  for (const p of paths) {
    try {
      const localRequire = createRequire(path.join(p, 'noop.js'));
      return path.dirname(localRequire.resolve(`${name}/package.json`));
    } catch {
      /* ignore */
    }
  }
  try {
    return path.dirname(require.resolve(`${name}/package.json`));
  } catch {
    return undefined;
  }
}

/**
 * Recursively scan a directory for loadable files (mimics FileLoader.parse using globby patterns).
 */
function scanDirectory(directory) {
  if (!fs.existsSync(directory)) return [];
  const results = [];

  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (LOADABLE_EXTENSIONS.includes(ext) && !entry.name.endsWith('.d.ts')) {
          results.push(fullPath);
        }
      }
    }
  }

  walk(directory);
  return results;
}

/**
 * Extract plugin package names from a plugin config file by static text analysis.
 *
 * This avoids dynamically importing the TypeScript config file (which would
 * fail if Node.js cannot parse the TypeScript syntax or resolve all imports).
 *
 * Supports two patterns:
 *   1. `package: '@eggjs/something'`  (explicit plugin declarations)
 *   2. `import ... from '@eggjs/something'` (plugins imported as factory functions)
 *
 * Returns an array of package name strings.
 */
function extractPluginPackages(configFilePath) {
  const content = fs.readFileSync(configFilePath, 'utf-8');
  const packages = new Set();

  // Pattern 1: package: '@scope/name' or package: 'name'
  const packageRegex = /package:\s*['"]([^'"]+)['"]/g;
  let match;
  while ((match = packageRegex.exec(content)) !== null) {
    packages.add(match[1]);
  }

  // Pattern 2: import ... from '@scope/name' (for plugin factory imports)
  // Only include scoped packages that look like egg plugins
  const importRegex = /import\s+\w+\s+from\s+['"](@eggjs\/[^'"]+)['"]/g;
  while ((match = importRegex.exec(content)) !== null) {
    packages.add(match[1]);
  }

  return [...packages];
}

/**
 * Resolve a plugin directory from its source directory.
 * Returns the src dir (where config/, app/ etc. live).
 */
function resolvePluginSrcDir(pluginDir) {
  let srcDir = pluginDir;
  const pkgPath = path.join(pluginDir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    const pluginPkg = readJSON(pkgPath);
    if (pluginPkg.exports?.['.']) {
      const mainExport = pluginPkg.exports['.'];
      const mainPath =
        typeof mainExport === 'string' ? mainExport : mainExport?.import?.default || mainExport?.import || '';
      if (mainPath) {
        srcDir = path.dirname(path.join(pluginDir, mainPath));
      }
    }
  }
  return srcDir;
}

/**
 * Discover plugins from the egg framework plugin config.
 *
 * Uses static text analysis (not dynamic import) to extract plugin package
 * names, then resolves each package using createRequire from the framework
 * path. This works even when the TypeScript config file cannot be imported
 * directly (e.g., due to non-strippable syntax or unresolvable imports).
 */
async function discoverPlugins(eggPaths, baseDir) {
  const plugins = [];
  const seen = new Set();

  // Build a require function that can resolve from the framework's dependencies
  const requirePaths = [...eggPaths, baseDir];
  const frameworkRequire = createRequire(path.join(eggPaths[0], 'noop.js'));

  for (const eggPath of eggPaths) {
    // Find the plugin config file
    let pluginConfigPath;
    for (const baseName of ['plugin', 'plugin.default']) {
      for (const ext of LOADABLE_EXTENSIONS) {
        const candidate = path.join(eggPath, 'config/' + baseName + ext);
        if (fs.existsSync(candidate)) {
          pluginConfigPath = candidate;
          break;
        }
      }
      if (pluginConfigPath) break;
    }

    if (!pluginConfigPath) continue;
    debug('Parsing plugin config from: %s', pluginConfigPath);

    // Extract plugin package names by static analysis
    const packageNames = extractPluginPackages(pluginConfigPath);
    debug('Found plugin packages: %o', packageNames);

    for (const pkgName of packageNames) {
      if (seen.has(pkgName)) continue;
      seen.add(pkgName);

      // Resolve the plugin package directory
      let pluginDir;
      try {
        const pkgJsonPath = frameworkRequire.resolve(`${pkgName}/package.json`);
        pluginDir = path.dirname(pkgJsonPath);
      } catch {
        pluginDir = tryResolvePackage(pkgName, requirePaths);
      }

      if (!pluginDir || !fs.existsSync(pluginDir)) {
        debug('Could not resolve plugin package %s', pkgName);
        continue;
      }

      const srcDir = resolvePluginSrcDir(pluginDir);

      // Derive a short plugin name from the package name
      const shortName = pkgName.replace(/^@eggjs\//, '').replace(/-plugin$/, '');

      plugins.push({
        name: shortName,
        package: pkgName,
        path: pluginDir,
        srcDir,
      });
      debug('Discovered plugin: %s (%s) at %s (src: %s)', shortName, pkgName, pluginDir, srcDir);
    }
  }

  return plugins;
}

/**
 * Discover all files that the egg loader would load from a load unit.
 */
function discoverUnitFiles(unitPath) {
  const files = [];

  // Config files
  for (const configName of CONFIG_NAMES) {
    for (const ext of LOADABLE_EXTENSIONS) {
      const configFile = path.join(unitPath, 'config', configName + ext);
      if (fs.existsSync(configFile)) {
        files.push(configFile);
      }
    }
  }

  // Extend files
  for (const name of EXTEND_NAMES) {
    for (const ext of LOADABLE_EXTENSIONS) {
      const extendFile = path.join(unitPath, 'app/extend', name + ext);
      if (fs.existsSync(extendFile)) {
        files.push(extendFile);
      }
      // Env-specific extends
      for (const env of ['local', 'prod', 'unittest']) {
        const envExtend = path.join(unitPath, 'app/extend', `${name}.${env}${ext}`);
        if (fs.existsSync(envExtend)) {
          files.push(envExtend);
        }
      }
    }
  }

  // Scan all subdirectories: services, controllers, middleware, schedules,
  // lib (for event-sources, etc.), and any other loadable files.
  // This catches dynamically loaded files like watcher event-sources.
  files.push(...scanDirectory(path.join(unitPath, 'app')));
  files.push(...scanDirectory(path.join(unitPath, 'lib')));

  // Boot hooks (app.ts / agent.ts at unit root)
  for (const hookName of ['app', 'agent']) {
    for (const ext of LOADABLE_EXTENSIONS) {
      const hookFile = path.join(unitPath, hookName + ext);
      if (fs.existsSync(hookFile)) {
        files.push(hookFile);
      }
    }
  }

  // Router
  for (const ext of LOADABLE_EXTENSIONS) {
    const routerFile = path.join(unitPath, 'app/router' + ext);
    if (fs.existsSync(routerFile)) {
      files.push(routerFile);
    }
  }

  return [...new Set(files)];
}

/**
 * Resolve the egg framework path from baseDir.
 */
function resolveFrameworkPath(baseDir, framework) {
  if (framework) {
    if (path.isAbsolute(framework)) return framework;
    // Try to resolve as a package
    const resolved = tryResolvePackage(framework, [baseDir]);
    if (resolved) return resolved;
    return path.resolve(baseDir, framework);
  }

  // Default: look for 'egg' package
  const eggDir = tryResolvePackage('egg', [baseDir]);
  if (eggDir) return eggDir;
  throw new Error('Cannot resolve egg framework from ' + baseDir);
}

/**
 * Get the egg framework's source directory (where config/, app/ etc. live).
 */
function getFrameworkSrcDir(frameworkPath) {
  const pkgPath = path.join(frameworkPath, 'package.json');
  if (fs.existsSync(pkgPath)) {
    const pkg = readJSON(pkgPath);
    if (pkg.exports?.['.']) {
      const mainExport = pkg.exports['.'];
      const mainPath =
        typeof mainExport === 'string' ? mainExport : mainExport?.import?.default || mainExport?.import || '';
      if (mainPath) {
        return path.dirname(path.join(frameworkPath, mainPath));
      }
    }
  }
  // Fallback: check if src/ exists
  if (fs.existsSync(path.join(frameworkPath, 'src'))) {
    return path.join(frameworkPath, 'src');
  }
  return frameworkPath;
}

async function main() {
  const options = JSON.parse(process.argv[2]);
  const { baseDir, env = 'prod', port = 7001 } = options;
  const frameworkPath = resolveFrameworkPath(baseDir, options.framework);
  const frameworkSrcDir = getFrameworkSrcDir(frameworkPath);

  console.log('[generate] Scanning egg application...');
  console.log('[generate]   baseDir:      %s', baseDir);
  console.log('[generate]   framework:    %s', frameworkPath);
  console.log('[generate]   frameworkSrc: %s', frameworkSrcDir);
  console.log('[generate]   env:          %s', env);

  // Step 1: Discover plugins
  const plugins = await discoverPlugins([frameworkSrcDir], baseDir);
  console.log('[generate]   plugins:      %d found', plugins.length);
  for (const p of plugins) {
    console.log('[generate]     - %s (%s) => %s', p.name, p.package || 'local', p.srcDir);
  }

  // Step 2: Collect all files from all load units
  const loadUnits = [];

  // Plugin files
  for (const plugin of plugins) {
    const unitFiles = discoverUnitFiles(plugin.srcDir);
    loadUnits.push({ name: plugin.name, path: plugin.srcDir, type: 'plugin', files: unitFiles });
  }

  // Framework files
  const frameworkFiles = discoverUnitFiles(frameworkSrcDir);
  loadUnits.push({ name: 'framework', path: frameworkSrcDir, type: 'framework', files: frameworkFiles });

  // App files
  const appFiles = discoverUnitFiles(baseDir);
  loadUnits.push({ name: 'app', path: baseDir, type: 'app', files: appFiles });

  // Deduplicate all files
  const allFilesSet = new Set();
  for (const unit of loadUnits) {
    for (const f of unit.files) {
      allFilesSet.add(f);
    }
  }
  const uniqueFiles = [...allFilesSet];
  console.log('[generate]   total files:  %d', uniqueFiles.length);

  // Step 3: Generate the snapshot entry file
  const outputDir = path.join(baseDir, 'dist');
  fs.mkdirSync(outputDir, { recursive: true });

  const entryPath = path.join(outputDir, 'snapshot-entry.mjs');
  const lines = [];

  lines.push('// AUTO-GENERATED by generate-snapshot-entry.mjs');
  lines.push('// Do not edit manually.');
  lines.push('');
  // NOTE: The esbuild banner injects globalThis.__EGG_SNAPSHOT_CJS_BUNDLE__ = true
  // at the very top of the CJS bundle (before any module init code). This forces
  // importModule() to use require() instead of import(), avoiding ESM loader async
  // hooks that corrupt the V8 snapshot builder.
  // NOTE: Do NOT import node:http at the top level.
  // require('node:http') registers global native handles (HTTPParser,
  // ConnectionsList) that V8 cannot serialize. The esbuild httpDeferPlugin
  // replaces the import with a lazy proxy, but we also avoid the top-level
  // import here so the intent is clear.
  lines.push('import v8 from "node:v8";');
  lines.push('import { debuglog } from "node:util";');
  lines.push('');

  // Import the framework's startEgg function
  // Check if the framework has an index.ts, .js, or .mjs
  let frameworkEntry;
  for (const ext of ['.ts', '.js', '.mjs']) {
    const candidate = path.join(frameworkSrcDir, 'index' + ext);
    if (fs.existsSync(candidate)) {
      frameworkEntry = candidate;
      break;
    }
  }
  // Also check lib/start.ts
  if (!frameworkEntry) {
    for (const ext of ['.ts', '.js', '.mjs']) {
      const candidate = path.join(frameworkSrcDir, 'lib/start' + ext);
      if (fs.existsSync(candidate)) {
        frameworkEntry = candidate;
        break;
      }
    }
  }

  if (frameworkEntry) {
    lines.push(`import * as framework from ${JSON.stringify(pathToFileURL(frameworkEntry).toString())};`);
  } else {
    lines.push(`import * as framework from ${JSON.stringify(frameworkPath)};`);
  }
  lines.push('');

  // Static imports for all discovered files with module registry
  lines.push('// === Pre-imported modules (discovered at generate time) ===');
  lines.push('const __moduleRegistry = new Map();');
  lines.push('');

  // Register the framework entry in the module registry so that
  // importModule(frameworkPath) finds it without calling require()/import().
  // This is critical for --build-snapshot which restricts module loading.
  if (frameworkEntry) {
    lines.push(`// Framework entry — needed by startEgg() -> importModule()`);
    lines.push(`__moduleRegistry.set(${JSON.stringify(frameworkEntry)}, framework);`);
    // Also register the framework directory path, since importResolve may
    // resolve the directory to its entry file via package.json exports.
    lines.push(`__moduleRegistry.set(${JSON.stringify(frameworkPath)}, framework);`);
    lines.push(`__moduleRegistry.set(${JSON.stringify(frameworkSrcDir)}, framework);`);
    // Register real paths (resolving symlinks) for framework entries
    const realFrameworkEntry = fs.realpathSync(frameworkEntry);
    const realFrameworkPath = fs.realpathSync(frameworkPath);
    const realFrameworkSrcDir = fs.realpathSync(frameworkSrcDir);
    if (realFrameworkEntry !== frameworkEntry) {
      lines.push(`__moduleRegistry.set(${JSON.stringify(realFrameworkEntry)}, framework);`);
    }
    if (realFrameworkPath !== frameworkPath) {
      lines.push(`__moduleRegistry.set(${JSON.stringify(realFrameworkPath)}, framework);`);
    }
    if (realFrameworkSrcDir !== frameworkSrcDir) {
      lines.push(`__moduleRegistry.set(${JSON.stringify(realFrameworkSrcDir)}, framework);`);
    }
    lines.push('');
  }

  for (let i = 0; i < uniqueFiles.length; i++) {
    const file = uniqueFiles[i];
    const varName = `__mod_${i}`;
    const importUrl = pathToFileURL(file).toString();
    lines.push(`import * as ${varName} from ${JSON.stringify(importUrl)};`);
    // Register under both the original path and the realpath (resolving symlinks).
    // The esbuild importMetaPolyfill replaces import.meta.dirname with the real
    // source path, so the loader resolves config files using real paths. But the
    // generator discovers files via symlinks (e.g., node_modules/egg -> packages/egg).
    // Registering both ensures the registry lookup succeeds regardless.
    lines.push(`__moduleRegistry.set(${JSON.stringify(file)}, ${varName});`);
    const realFile = fs.realpathSync(file);
    if (realFile !== file) {
      lines.push(`__moduleRegistry.set(${JSON.stringify(realFile)}, ${varName});`);
    }
  }

  lines.push('');
  lines.push('// Expose the registry globally for importModule() interception');
  lines.push('// (see @eggjs/utils importModule snapshot registry support)');
  lines.push('globalThis.__snapshotModuleRegistry = __moduleRegistry;');
  lines.push('');

  // Build-time: no app initialization, just register the module registry
  // and set up the deserialize main function. This avoids creating any
  // async operations (loggers, timers, event emitters) that would corrupt
  // the V8 snapshot builder's async hook stack.
  lines.push('const debug = debuglog("egg/snapshot-entry");');
  lines.push('');
  lines.push('console.log("[snapshot] %d modules pre-loaded into registry", __moduleRegistry.size);');
  lines.push('');
  lines.push('// Store app options for deserialization');
  lines.push(
    `const __snapshotOptions = ${JSON.stringify(
      {
        baseDir,
        framework: options.framework || frameworkPath,
        env,
        mode: 'single',
      },
      null,
      2,
    )};`,
  );
  lines.push('');
  lines.push('// Main function for snapshot restore — starts the app at restore time');
  lines.push('v8.startupSnapshot.setDeserializeMainFunction(async (data) => {');
  lines.push('  const port = parseInt(process.env.PORT || "0") || data.port;');
  lines.push('  const title = process.env.EGG_SERVER_TITLE || data.title || "";');
  lines.push('  if (title) process.title = title;');
  lines.push('');
  lines.push('  debug("Starting egg app from snapshot, %d modules pre-loaded", __moduleRegistry.size);');
  lines.push('');
  lines.push(
    '  const startFn = framework.startEgg ?? framework.default?.startEgg ?? framework.start ?? framework.default?.start;',
  );
  lines.push('  if (typeof startFn !== "function") {');
  lines.push('    throw new Error("Cannot find startEgg from framework: " + JSON.stringify(Object.keys(framework)));');
  lines.push('  }');
  lines.push('');
  lines.push('  const app = await startFn(__snapshotOptions);');
  lines.push('');
  lines.push('  // Create HTTP server');
  lines.push('  const http = require("node:http");');
  lines.push('  const server = http.createServer(app.callback());');
  lines.push('  app.emit("server", server);');
  lines.push('');
  lines.push('  server.listen(port, () => {');
  lines.push('    const addr = server.address();');
  lines.push('    const url = typeof addr === "string" ? addr : `http://127.0.0.1:${addr.port}`;');
  lines.push('    console.log("[snapshot] Server started on %s (from snapshot)", url);');
  lines.push('    if (process.send) {');
  lines.push('      process.send({ action: "egg-ready", data: { address: url, port: addr?.port ?? port } });');
  lines.push('    }');
  lines.push('  });');
  lines.push('');
  lines.push('  app.messenger.broadcast("egg-ready");');
  lines.push('');
  lines.push('  const shutdown = (signal) => {');
  lines.push('    debug("shutdown: %s", signal);');
  lines.push('    server.close(() => {');
  lines.push('      app.close?.().then(() => process.exit(0)).catch(() => process.exit(1));');
  lines.push('    });');
  lines.push('    setTimeout(() => process.exit(1), 10000).unref();');
  lines.push('  };');
  lines.push('  process.once("SIGTERM", () => shutdown("SIGTERM"));');
  lines.push('  process.once("SIGINT", () => shutdown("SIGINT"));');
  lines.push(`}, { port: ${port}, title: ${JSON.stringify(options.title || '')} });`);
  lines.push('');
  lines.push('console.log("[snapshot] Ready for snapshot build");');

  fs.writeFileSync(entryPath, lines.join('\n'), 'utf-8');
  console.log('[generate] Written: %s', entryPath);

  // Step 4: Generate utoopack.json
  const utooConfig = {
    entry: [{ import: './dist/snapshot-entry.mjs', name: 'snapshot' }],
    target: 'node 22.18',
    output: {
      path: './dist/bundled',
      clean: true,
    },
    sourceMaps: false,
    optimization: {
      moduleIds: 'named',
      minify: false,
      treeShaking: false,
    },
    externals: {},
  };

  // Externalize all node: built-in modules
  const nodeBuiltins = [
    'fs',
    'path',
    'http',
    'https',
    'url',
    'util',
    'os',
    'crypto',
    'stream',
    'events',
    'buffer',
    'assert',
    'zlib',
    'net',
    'tls',
    'dns',
    'child_process',
    'cluster',
    'worker_threads',
    'v8',
    'vm',
    'readline',
    'querystring',
    'string_decoder',
    'timers',
    'async_hooks',
    'perf_hooks',
    'diagnostics_channel',
    'inspector',
    'process',
    'module',
    'constants',
    'domain',
    'punycode',
    'tty',
    'dgram',
    'http2',
    'console',
  ];
  for (const mod of nodeBuiltins) {
    utooConfig.externals[`node:${mod}`] = `module node:${mod}`;
  }
  // Native addons
  utooConfig.externals['fsevents'] = 'commonjs fsevents';
  utooConfig.externals['cpu-features'] = 'commonjs cpu-features';

  const utooConfigPath = path.join(baseDir, 'utoopack.json');
  fs.writeFileSync(utooConfigPath, JSON.stringify(utooConfig, null, 2), 'utf-8');
  console.log('[generate] Written: %s', utooConfigPath);

  // Summary
  console.log('');
  console.log('[generate] === Summary ===');
  for (const unit of loadUnits) {
    console.log('[generate]   %s (%s): %d files', unit.name, unit.type, unit.files.length);
    for (const f of unit.files) {
      console.log('[generate]     %s', path.relative(baseDir, f));
    }
  }
  console.log('[generate]');
  console.log('[generate] Next steps:');
  console.log('[generate]   1. cd %s', baseDir);
  console.log('[generate]   2. ut x @utoo/pack-cli -- build');
  console.log('[generate]   3. node --build-snapshot --snapshot-blob snapshot.blob dist/bundled/snapshot.mjs');
  console.log('[generate]   OR (without utoo bundling):');
  console.log('[generate]   2. node --build-snapshot --snapshot-blob snapshot.blob dist/snapshot-entry.mjs');
}

main().catch((err) => {
  console.error('[generate] Error:', err);
  console.error(err.stack);
  process.exit(1);
});
