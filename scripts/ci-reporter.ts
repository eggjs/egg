import { mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import type { Reporter, TestModule, Vitest } from 'vitest/node';

// Public Vitest diagnostics include imports and suite hooks, unlike JSON test intervals.
export default class CiReporter implements Reporter {
  private ctx!: Vitest;
  private expected: string[] = [];
  private startedAt = 0;
  private coveredFiles = 0;

  onInit(ctx: Vitest): void {
    this.ctx = ctx;
  }

  async onTestRunStart(): Promise<void> {
    this.startedAt = Date.now();
    const specs = await this.ctx.globTestSpecifications();
    this.expected = specs.map((spec) => this.key(spec.project.name, spec.moduleId)).sort();
  }

  onCoverage(coverage: unknown): void {
    // Vitest passes an Istanbul CoverageMap, not its serialized file map.
    if (coverage && typeof coverage === 'object' && 'files' in coverage && typeof coverage.files === 'function') {
      const files: unknown = coverage.files();
      this.coveredFiles = Array.isArray(files) ? files.length : 0;
    }
  }

  async onTestRunEnd(
    modules: ReadonlyArray<TestModule>,
    errors: ReadonlyArray<unknown>,
    reason: string,
  ): Promise<void> {
    const cpus = os.availableParallelism();
    const projects = this.ctx.projects.map(({ name, config }) => ({
      name,
      pool: config.pool,
      isolate: config.isolate,
      maxWorkers:
        typeof config.maxWorkers === 'string'
          ? Math.max(1, Math.min(cpus, Math.round((Number.parseInt(config.maxWorkers) / 100) * cpus)))
          : (config.maxWorkers ?? Math.max(cpus - 1, 1)),
      fsModuleCache: config.fsModuleCache,
    }));
    const report = {
      commit: process.env.GITHUB_SHA,
      node: process.version,
      os: process.platform,
      arch: process.arch,
      cpus,
      workerCeiling: Math.max(...projects.map((project) => project.maxWorkers)),
      vitest: this.ctx.version,
      shard: this.ctx.config.shard ?? { index: 1, count: 1 },
      durationMs: Date.now() - this.startedAt,
      success: reason === 'passed' && errors.length === 0,
      coveredFiles: this.coveredFiles,
      expected: this.expected,
      projects,
      files: modules.map((module) => ({
        key: this.key(module.project.name, module.moduleId),
        state: module.state(),
        ...module.diagnostic(),
        retries: [...module.children.allTests()].reduce(
          (total, test) => total + (test.diagnostic()?.retryCount ?? 0),
          0,
        ),
      })),
    };
    const directory = path.join(this.ctx.config.root, 'benchmark/ci-test/ci-run');
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, 'execution.json'), `${JSON.stringify(report, null, 2)}\n`);
  }

  private key(project: string, file: string): string {
    return `${project}:${path.relative(this.ctx.config.root, file).split(path.sep).join('/')}`;
  }
}
