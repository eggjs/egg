import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PackRunner, type BuildFunc, type PackEntry } from '../src/lib/PackRunner.ts';

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
      buildFunc: overrides.buildFunc ?? (async () => {}),
    });
  }

  it('writes the output tsconfig.json with decorator metadata flags set before invoking the build', async () => {
    let tsconfigAtBuildTime: string | undefined;
    const buildFunc: BuildFunc = async () => {
      tsconfigAtBuildTime = await fs.readFile(path.join(tmpDir, 'out', 'tsconfig.json'), 'utf8');
    };

    await makeRunner({ buildFunc }).run();

    expect(tsconfigAtBuildTime).toBeDefined();
    const parsed = JSON.parse(tsconfigAtBuildTime!);
    expect(parsed.compilerOptions.experimentalDecorators).toBe(true);
    expect(parsed.compilerOptions.emitDecoratorMetadata).toBe(true);
    expect(parsed.compilerOptions.target).toBe('es2022');
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

  it('passes a pack config with entry[], target node 22, platform node, standalone output, and UMD-form externals through to buildFunc', async () => {
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
    expect(config.entry).toEqual([
      { name: 'worker', import: '/abs/worker.entry.ts' },
      { name: 'agent', import: '/abs/agent.entry.ts' },
    ]);
    expect(config.target).toBe('node 22');
    expect(config.platform).toBe('node');
    expect(config.output).toEqual({ path: path.join(tmpDir, 'out'), type: 'standalone' });
    // Externals must be UMD-form ({ commonjs, root }) so @utoo/pack standalone
    // output emits `require(name)` for CJS runtime (not globalThis[name]).
    expect(config.externals).toEqual({
      '@eggjs/core': { commonjs: '@eggjs/core', root: '@eggjs/core' },
    });
    expect(config.resolve).toBeUndefined();
    expect(projectPath).toBe(tmpDir);
    expect(rootPath).toBe(tmpDir);
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
    await makeRunner({ buildFunc, projectPath: '/custom/project' }).run();
    const [, projectPath, rootPath] = buildFunc.mock.calls[0]!;
    expect(projectPath).toBe('/custom/project');
    expect(rootPath).toBe('/custom/project');
  });

  it('forwards a distinct rootPath when the caller provides it', async () => {
    const buildFunc = vi.fn<BuildFunc>(async () => {});
    await makeRunner({ buildFunc, projectPath: '/proj', rootPath: '/monorepo/root' }).run();
    const [, projectPath, rootPath] = buildFunc.mock.calls[0]!;
    expect(projectPath).toBe('/proj');
    expect(rootPath).toBe('/monorepo/root');
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
    // tsconfig.json + package.json are pre-written, then buildFunc adds worker/agent/nested/chunk
    const expected = ['agent.js', path.join('nested', 'chunk.js'), 'package.json', 'tsconfig.json', 'worker.js'].sort();
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
