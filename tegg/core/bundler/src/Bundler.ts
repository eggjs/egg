import fs from 'node:fs/promises';
import path from 'node:path';

import { ControllerMetadataUtil, HTTPControllerMeta } from '@eggjs/controller-decorator';
import { PrototypeUtil } from '@eggjs/core-decorator';
import { ClassProtoDescriptor, GlobalGraph } from '@eggjs/metadata';
import { LoaderFactory } from '@eggjs/tegg-loader';
import { ControllerType } from '@eggjs/tegg-types';
import type { ModuleReference } from '@eggjs/tegg-types';

import { DependencyResolver } from './DependencyResolver.ts';
import { EntryGenerator } from './EntryGenerator.ts';
import { MetaGenerator } from './MetaGenerator.ts';
import type { MethodMeta } from './MetaGenerator.ts';
import { MethodAnalyzer } from './MethodAnalyzer.ts';

export type { MethodMeta };

export interface BundlerOptions {
  /** Output directory for bundles and meta files */
  outputPath: string;
  /** Tegg module references to scan */
  moduleReferences: ModuleReference[];
  /** Externals config passed to the bundler (package → global var mapping) */
  externals?: Record<string, string>;
  /** Build mode */
  mode?: 'production' | 'development';
}

export interface MethodBundleResult {
  /** Unique key for this method bundle, e.g. "UserController.getUser" */
  key: string;
  /** Absolute path to the bundled JS file */
  bundlePath: string;
  /** Absolute path to the meta JSON file */
  metaPath: string;
  /** Parsed meta object */
  meta: MethodMeta;
}

/**
 * Options for the build step.
 * Users provide a `BuildFunc` that accepts these options and produces a JS bundle.
 * Example implementation: use `@utoo/pack` or `esbuild`.
 */
export interface BuildOptions {
  entry: Array<{ name: string; import: string }>;
  target: string;
  platform: 'browser' | 'node';
  output: { path: string; type: string };
  externals: Record<string, string>;
  optimization: { treeShaking: boolean; removeUnusedExports: boolean };
  mode: 'production' | 'development';
  /** Project root path — used by Turbopack to resolve entry imports */
  projectPath?: string;
  /** Root path — filesystem boundary for module resolution */
  rootPath?: string;
}

/**
 * A function that takes build options and produces a JS bundle.
 * Users can inject their own implementation (e.g. @utoo/pack, esbuild, rollup).
 */
export type BuildFunc = (options: BuildOptions) => Promise<void>;

/**
 * Main orchestrator for the tegg serverless bundler.
 *
 * For each controller method:
 * 1. Analyzes the method body to find accessed services
 * 2. Resolves the full transitive dependency closure
 * 3. Generates a minimal entry file importing only needed deps
 * 4. Calls the user-provided build function to produce a standalone bundle
 * 5. Generates a meta JSON file with HTTP routing + DI dependency info
 */
export class Bundler {
  private readonly buildFunc: BuildFunc;

  constructor(buildFunc?: BuildFunc) {
    // Default build func: dynamically import @utoo/pack
    this.buildFunc = buildFunc ?? defaultBuildFunc;
  }

  async bundle(options: BundlerOptions): Promise<MethodBundleResult[]> {
    const {
      outputPath,
      moduleReferences,
      mode = 'production',
      externals = {
        // @swc/helpers is injected by SWC when compiling decorators
        // (experimentalDecorators). It must be external so the bundled
        // output can resolve it from node_modules at runtime.
        '@swc/helpers': '@swc/helpers',
      },
    } = options;

    // Load all modules and build the global dependency graph
    const moduleDescriptors = await LoaderFactory.loadApp(moduleReferences);
    const globalGraph = await GlobalGraph.create(moduleDescriptors);
    globalGraph.build();
    globalGraph.sort();

    const analyzer = new MethodAnalyzer();
    const resolver = new DependencyResolver(globalGraph);
    const entryGenerator = new EntryGenerator();
    const metaGenerator = new MetaGenerator();

    // Create temp dir for generated entry files inside outputPath
    // so Turbopack can resolve them relative to the project root
    const tmpDir = path.join(outputPath, '.tegg-entries');

    // Write a tsconfig.json in outputPath so Turbopack/SWC enables
    // experimentalDecorators when compiling TypeScript source files.
    // Without this, decorator syntax (@Controller, @Inject, etc.) fails
    // at the chunk code generation stage.
    await fs.mkdir(outputPath, { recursive: true });
    await fs.writeFile(
      path.join(outputPath, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          experimentalDecorators: true,
        },
      }) + '\n',
    );

    const results: MethodBundleResult[] = [];

    try {
      await fs.mkdir(outputPath, { recursive: true });

      for (const [, protos] of globalGraph.moduleProtoDescriptorMap) {
        for (const proto of protos) {
          if (!ClassProtoDescriptor.isClassProtoDescriptor(proto)) continue;

          const controllerMeta = ControllerMetadataUtil.getControllerMetadata(proto.clazz);
          if (!controllerMeta || controllerMeta.type !== ControllerType.HTTP) continue;

          if (!(controllerMeta instanceof HTTPControllerMeta)) continue;

          const filePath = PrototypeUtil.getFilePath(proto.clazz);
          if (!filePath) continue;

          for (const methodMeta of controllerMeta.methods) {
            const key = `${controllerMeta.controllerName}.${methodMeta.name}`;

            // Step 1: Analyze which injected services the method actually uses
            const accessedProps = analyzer.analyze(filePath, proto.clazz.name, methodMeta.name);

            // Step 2: Resolve the full dependency closure for those services
            const deps = resolver.resolve(proto, accessedProps);

            // Step 3: Generate entry file with only needed imports
            const entryPath = await entryGenerator.generate(tmpDir, proto.clazz, methodMeta.name, deps);

            // Step 4: Bundle via user-provided build function
            // Each method gets its own output subdirectory to avoid filename collisions
            // (@utoo/pack may merge entries sharing the same controller into one file)
            const methodOutputPath = path.join(outputPath, key);
            await fs.mkdir(methodOutputPath, { recursive: true });
            // Turbopack platform:'node' outputs CJS bundles (require/module.exports).
            // Write a package.json to ensure Node.js treats .js files as CommonJS,
            // even if a parent package.json has "type": "module".
            await fs.writeFile(path.join(methodOutputPath, 'package.json'), '{"type":"commonjs"}\n');
            await this.buildFunc({
              entry: [{ name: key, import: entryPath }],
              target: 'node 22',
              platform: 'node',
              output: { path: methodOutputPath, type: 'standalone' },
              externals,
              optimization: { treeShaking: true, removeUnusedExports: true },
              mode,
              // Use parent outputPath as projectPath so Turbopack can resolve
              // entry files in .tegg-entries/; rootPath is auto-detected so
              // it can resolve source files outside the output directory
              projectPath: outputPath,
            });
            // Find the actual output JS file (entry name may be transformed by the bundler)
            const outputFiles = await fs.readdir(methodOutputPath);
            const jsFile = outputFiles.find((f) => f.endsWith('.js') && !f.startsWith('_turbopack'));
            if (!jsFile) {
              throw new Error(`No JS output file found in ${methodOutputPath} for ${key}`);
            }
            const bundlePath = path.join(methodOutputPath, jsFile);

            // Step 5: Generate meta file
            const meta = metaGenerator.generate(controllerMeta, methodMeta, deps, proto, accessedProps);
            const metaPath = path.join(outputPath, `${key}.meta.json`);
            await fs.writeFile(metaPath, JSON.stringify(meta, null, 2));

            results.push({ key, bundlePath, metaPath, meta });
          }
        }
      }
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }

    return results;
  }
}

async function defaultBuildFunc(options: BuildOptions): Promise<void> {
  // Dynamically import @utoo/pack build command to avoid hard dependency.
  // Uses the sub-path import to avoid loading HMR/WebSocket code from the root entry.
  // Users must install @utoo/pack themselves if using the default build function.
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { build } = (await import('@utoo/pack/esm/commands/build.js' as any)) as {
      build: (options: { config: BuildOptions }, projectPath?: string, rootPath?: string) => Promise<void>;
    };
    const projectPath = options.projectPath ?? options.output.path;
    const rootPath = options.rootPath;
    await build({ config: options }, projectPath, rootPath);
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ERR_MODULE_NOT_FOUND') {
      throw new Error(
        'Default build function requires @utoo/pack to be installed. ' +
          'Either install @utoo/pack or provide a custom buildFunc to the Bundler constructor.',
        { cause: err },
      );
    }
    throw err;
  }
}
