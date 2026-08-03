import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PackRunner, type BuildFunc, type PackEntry, type PackRunnerModuleConfig } from '../src/lib/PackRunner.ts';

describe('PackRunner', () => {
  let tmpDir: string;
  const createdDirs: string[] = [];

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'egg-bundler-pack-runner-'));
    createdDirs.push(tmpDir);
  });

  afterEach(async () => {
    while (createdDirs.length) {
      const dir = createdDirs.pop()!;
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  function makeRunner(
    overrides: {
      entries?: readonly PackEntry[];
      outputDir?: string;
      externals?: Record<string, string>;
      projectPath?: string;
      rootPath?: string;
      mode?: 'production' | 'development';
      buildFunc?: BuildFunc;
      resolve?: {
        alias?: Record<string, string>;
        [key: string]: unknown;
      };
      module?: PackRunnerModuleConfig;
      singleFile?: boolean;
    } = {},
  ): PackRunner {
    const outputDir = overrides.outputDir ?? path.join(tmpDir, 'out');
    const projectPath = overrides.projectPath ?? tmpDir;
    return new PackRunner({
      entries: overrides.entries ?? [{ name: 'worker', filepath: path.join(tmpDir, 'worker.entry.ts') }],
      outputDir,
      externals: overrides.externals ?? {},
      projectPath,
      ...(overrides.rootPath !== undefined ? { rootPath: overrides.rootPath } : {}),
      ...(overrides.mode !== undefined ? { mode: overrides.mode } : {}),
      ...(overrides.resolve !== undefined ? { resolve: overrides.resolve } : {}),
      ...(overrides.module !== undefined ? { module: overrides.module } : {}),
      ...(overrides.singleFile !== undefined ? { singleFile: overrides.singleFile } : {}),
      buildFunc: overrides.buildFunc ?? (async () => {}),
    });
  }

  it('writes the compiler tsconfig.json into the PROJECT dir (where @utoo/pack resolves it) with decorator metadata flags before invoking the build', async () => {
    let projectTsconfig: string | undefined;
    let outputHasTsconfig = true;
    const buildFunc: BuildFunc = async () => {
      // @utoo/pack reads tsconfig from the project dir, not the output dir.
      projectTsconfig = await fs.readFile(path.join(tmpDir, 'tsconfig.json'), 'utf8');
      outputHasTsconfig = await fs
        .stat(path.join(tmpDir, 'out', 'tsconfig.json'))
        .then(() => true)
        .catch(() => false);
    };

    await makeRunner({ buildFunc }).run();

    expect(projectTsconfig).toBeDefined();
    const parsed = JSON.parse(projectTsconfig!);
    expect(parsed.compilerOptions.experimentalDecorators).toBe(true);
    expect(parsed.compilerOptions.emitDecoratorMetadata).toBe(true);
    expect(parsed.compilerOptions.target).toBe('es2022');
    // The output dir tsconfig is gone — it never governed compilation.
    expect(outputHasTsconfig).toBe(false);
  });

  it('writes useDefineForClassFields:false into the project tsconfig so declared-but-uninitialized class fields are not emitted as shadowing own fields', async () => {
    let projectTsconfig: string | undefined;
    const buildFunc: BuildFunc = async () => {
      projectTsconfig = await fs.readFile(path.join(tmpDir, 'tsconfig.json'), 'utf8');
    };

    await makeRunner({ buildFunc }).run();

    const parsed = JSON.parse(projectTsconfig!);
    // With target es2022, TS/SWC default this to true, which would emit own
    // class fields that shadow ORM prototype accessors (leoric Bone models),
    // silently dropping columns on INSERT. Must be explicitly disabled.
    expect(parsed.compilerOptions.useDefineForClassFields).toBe(false);
  });

  it('writes package.json { "type": "commonjs" } into the output dir so @utoo/pack CJS output parses correctly', async () => {
    let pkgAtBuildTime: string | undefined;
    const buildFunc: BuildFunc = async () => {
      pkgAtBuildTime = await fs.readFile(path.join(tmpDir, 'out', 'package.json'), 'utf8');
    };

    await makeRunner({ buildFunc }).run();

    expect(pkgAtBuildTime).toBeDefined();
    expect(JSON.parse(pkgAtBuildTime!)).toEqual({ type: 'commonjs' });
  });

  it('creates the output directory recursively even when intermediate dirs do not exist', async () => {
    const deepOut = path.join(tmpDir, 'a', 'b', 'c', 'out');
    await makeRunner({ outputDir: deepOut }).run();
    await expect(fs.stat(deepOut)).resolves.toBeTruthy();
  });

  it('defaults to single-file export output with a per-entry library, target node 22, platform node, and commonjs-type externals through to buildFunc', async () => {
    const buildFunc = vi.fn<BuildFunc>(async () => {});
    const entries: PackEntry[] = [
      { name: 'worker', filepath: '/abs/worker.entry.ts' },
      { name: 'agent', filepath: '/abs/agent.entry.ts' },
    ];
    const externals = { '@eggjs/core': '@eggjs/core' };

    await makeRunner({ entries, externals, buildFunc }).run();

    expect(buildFunc).toHaveBeenCalledTimes(1);
    const [wrapped, projectPath, rootPath] = buildFunc.mock.calls[0]!;
    const config = (wrapped as { config: Record<string, unknown> }).config;
    // Single-file is the default: `export` type + per-entry `library` makes
    // @utoo/pack inline every module into one self-executing IIFE (no
    // sibling-chunk require) — snapshot-eligible.
    expect(config.entry).toEqual([
      { name: 'worker', import: '/abs/worker.entry.ts', library: { name: 'app' } },
      { name: 'agent', import: '/abs/agent.entry.ts', library: { name: 'app' } },
    ]);
    expect(config.target).toBe('node 22');
    expect(config.platform).toBe('node');
    expect(config.output).toEqual({ path: path.join(tmpDir, 'out'), type: 'export' });
    // Single-file: externals are ExternalType `commonjs` ({ root, type }) so
    // @utoo/pack emits a direct require(name) (surfaced as externalRequire, which
    // the snapshot lazy hook intercepts). UMD form would fall through to
    // globalThis[name] = undefined inside the single-file IIFE (no CommonJS
    // module/exports in scope there).
    expect(config.externals).toEqual({
      '@eggjs/core': { root: '@eggjs/core', type: 'commonjs' },
    });
    expect(config.resolve).toBeUndefined();
    expect(projectPath).toBe(tmpDir);
    expect(rootPath).toBe(tmpDir);
  });

  it('emits legacy multi-chunk standalone output (no per-entry library) when singleFile is explicitly disabled', async () => {
    const buildFunc = vi.fn<BuildFunc>(async () => {});
    const entries: PackEntry[] = [
      { name: 'worker', filepath: '/abs/worker.entry.ts' },
      { name: 'agent', filepath: '/abs/agent.entry.ts' },
    ];

    await makeRunner({ entries, singleFile: false, buildFunc }).run();

    const config = (buildFunc.mock.calls[0]![0] as { config: Record<string, unknown> }).config;
    expect(config.output).toEqual({ path: path.join(tmpDir, 'out'), type: 'standalone' });
    expect(config.entry).toEqual([
      { name: 'worker', import: '/abs/worker.entry.ts' },
      { name: 'agent', import: '/abs/agent.entry.ts' },
    ]);
    // standalone mode must not attach a per-entry library.
    expect(config.entry).not.toContainEqual(expect.objectContaining({ library: expect.anything() }));
  });

  it('passes application supplied resolve aliases through to the pack config', async () => {
    const buildFunc = vi.fn<BuildFunc>(async () => {});
    const alias = {
      'some-package': path.join(tmpDir, 'node_modules', 'some-package', 'index.js'),
    };

    await makeRunner({ buildFunc, resolve: { alias } }).run();

    const config = (buildFunc.mock.calls[0]![0] as { config: Record<string, unknown> }).config;
    expect(config.resolve).toEqual({ alias });
  });

  it('preserves non-alias resolve options while cloning aliases', async () => {
    const buildFunc = vi.fn<BuildFunc>(async () => {});
    const alias = {
      'some-package': path.join(tmpDir, 'node_modules', 'some-package', 'index.js'),
    };

    await makeRunner({ buildFunc, resolve: { conditionNames: ['node'], alias } }).run();

    const config = (buildFunc.mock.calls[0]![0] as { config: Record<string, unknown> }).config;
    expect(config.resolve).toEqual({
      conditionNames: ['node'],
      alias,
    });
    expect((config.resolve as { alias: Record<string, string> }).alias).not.toBe(alias);
  });

  it('passes internal source-transform module rules through to @utoo/pack', async () => {
    const buildFunc = vi.fn<BuildFunc>(async () => {});
    const module: PackRunnerModuleConfig = {
      rules: {
        '*.js': {
          condition: { path: /[\\/]leoric[\\/]lib[\\/]/ },
          loaders: [{ loader: '/loaders/leoric-runtime-require-loader.cjs' }],
        },
      },
    };

    await makeRunner({ buildFunc, module }).run();

    const config = (buildFunc.mock.calls[0]![0] as { config: Record<string, unknown> }).config;
    expect(config.module).toBe(module);
  });

  it('disables treeShaking and minify in the pack config (tegg runtime requires the full graph)', async () => {
    const buildFunc = vi.fn<BuildFunc>(async () => {});
    await makeRunner({ buildFunc }).run();
    const config = (buildFunc.mock.calls[0]![0] as { config: Record<string, unknown> }).config;
    expect(config.optimization).toEqual({ treeShaking: false, minify: false });
  });

  it('defaults mode to production when no mode is provided', async () => {
    const buildFunc = vi.fn<BuildFunc>(async () => {});
    await makeRunner({ buildFunc }).run();
    const config = (buildFunc.mock.calls[0]![0] as { config: Record<string, unknown> }).config;
    expect(config.mode).toBe('production');
  });

  it('forwards a custom mode (development) to the pack config when the caller sets it', async () => {
    const buildFunc = vi.fn<BuildFunc>(async () => {});
    await makeRunner({ buildFunc, mode: 'development' }).run();
    const config = (buildFunc.mock.calls[0]![0] as { config: Record<string, unknown> }).config;
    expect(config.mode).toBe('development');
  });

  it('defaults rootPath to projectPath when the caller omits rootPath', async () => {
    const buildFunc = vi.fn<BuildFunc>(async () => {});
    // PackRunner writes the compiler tsconfig into projectPath, so it must be a
    // real, writable directory.
    const customProject = path.join(tmpDir, 'custom-project');
    await makeRunner({ buildFunc, projectPath: customProject }).run();
    const [, projectPath, rootPath] = buildFunc.mock.calls[0]!;
    expect(projectPath).toBe(customProject);
    expect(rootPath).toBe(customProject);
  });

  it('forwards a distinct rootPath when the caller provides it', async () => {
    const buildFunc = vi.fn<BuildFunc>(async () => {});
    const proj = path.join(tmpDir, 'proj');
    const monorepoRoot = path.join(tmpDir, 'monorepo-root');
    await makeRunner({ buildFunc, projectPath: proj, rootPath: monorepoRoot }).run();
    const [, projectPath, rootPath] = buildFunc.mock.calls[0]!;
    expect(projectPath).toBe(proj);
    expect(rootPath).toBe(monorepoRoot);
  });

  it('returns the outputDir and a sorted list of files that @utoo/pack produced', async () => {
    const outputDir = path.join(tmpDir, 'out');
    const buildFunc: BuildFunc = async () => {
      await fs.mkdir(path.join(outputDir, 'nested'), { recursive: true });
      await fs.writeFile(path.join(outputDir, 'worker.js'), 'worker;');
      await fs.writeFile(path.join(outputDir, 'agent.js'), 'agent;');
      await fs.writeFile(path.join(outputDir, 'nested', 'chunk.js'), 'chunk;');
    };

    const result = await makeRunner({ buildFunc }).run();

    expect(result.outputDir).toBe(outputDir);
    // package.json is pre-written into the output dir (the compiler tsconfig now
    // goes into the project dir, not the output), then buildFunc adds the chunks.
    const expected = ['agent.js', path.join('nested', 'chunk.js'), 'package.json', 'worker.js'].sort();
    expect([...result.files]).toEqual(expected);
  });

  it('wraps buildFunc failures in an Error that names every entry and preserves the cause', async () => {
    const original = new Error('pack crashed');
    const buildFunc: BuildFunc = async () => {
      throw original;
    };
    const runner = makeRunner({
      entries: [
        { name: 'worker', filepath: '/a.ts' },
        { name: 'agent', filepath: '/b.ts' },
      ],
      buildFunc,
    });

    await expect(runner.run()).rejects.toThrowError(/PackRunner failed to build worker, agent: pack crashed/);
    try {
      await runner.run();
    } catch (err) {
      expect((err as Error).cause).toBe(original);
    }
  });

  it('wraps non-Error buildFunc failures with a useful message', async () => {
    const buildFunc: BuildFunc = async () => {
      throw 'pack crashed as string';
    };

    await expect(makeRunner({ buildFunc }).run()).rejects.toThrowError(
      /PackRunner failed to build worker: pack crashed as string/,
    );
  });
});
