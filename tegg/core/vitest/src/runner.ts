import type { RunnerTestSuite as Suite, RunnerTask as Task, RunnerTestFile as File } from 'vitest';
import { VitestTestRunner } from 'vitest/runners';

import { debugLog, defaultGetApp, restoreEggMocksIfNeeded } from './shared.ts';
import type { EggMockApp } from './shared.ts';

interface TeggRunnerConfig {
  restoreMocks: boolean;
  getApp: () => Promise<EggMockApp | undefined> | EggMockApp | undefined;
}

interface HeldScope {
  scopePromise: Promise<void>;
  endScope: () => void;
}

interface FileAppState {
  app: EggMockApp;
  config: TeggRunnerConfig;
}

interface FileScopeState {
  app: EggMockApp;
  config: TeggRunnerConfig;
  suiteCtx: any;
  suiteScope: HeldScope | null;
}

interface TaskScopeState {
  testScope: HeldScope | null;
  filepath: string;
}

/**
 * Create a held beginModuleScope: starts the scope and waits until init() is
 * complete (the inner fn starts executing), then returns the held scope.
 * The scope stays alive until endScope() is called.
 */
async function createHeldScope(ctx: any): Promise<HeldScope> {
  let endScope!: () => void;
  const gate = new Promise<void>((resolve) => {
    endScope = resolve;
  });

  let scopeReady!: () => void;
  const readyPromise = new Promise<void>((resolve) => {
    scopeReady = resolve;
  });

  const scopePromise = ctx.beginModuleScope(async () => {
    // init() has completed at this point, signal readiness
    scopeReady();
    await gate;
  });

  // Race readyPromise against scopePromise: if beginModuleScope rejects
  // before invoking the callback (so scopeReady is never called), the error
  // propagates immediately instead of hanging forever on readyPromise.
  // Promise.race attaches a rejection handler to scopePromise, so there are
  // no unhandled rejections. scopePromise itself is preserved as-is for
  // gate/endScope behavior in releaseHeldScope.
  await Promise.race([readyPromise, scopePromise]);

  return { scopePromise, endScope };
}

async function releaseHeldScope(scope: HeldScope | null): Promise<void> {
  if (!scope) return;
  scope.endScope();
  await scope.scopePromise;
}

function isFileSuite(suite: Suite): suite is File {
  return !suite.suite && !!(suite as File).filepath;
}

function getTaskFilepath(task: Task): string | undefined {
  return (task as any).file?.filepath;
}

export default class TeggVitestRunner extends VitestTestRunner {
  private fileScopeMap = new Map<string, FileScopeState>();
  private taskScopeMap = new Map<string, TaskScopeState>();
  private fileAppMap = new Map<string, FileAppState>();
  private warned = false;

  /**
   * Override importFile to capture per-file config set by configureTeggRunner()
   * and await app.ready() during collection phase.
   */
  async importFile(filepath: string, source: Parameters<VitestTestRunner['importFile']>[1]): Promise<unknown> {
    // Clear stale state for this file before re-collection in watch mode
    if (source === 'collect') {
      this.fileAppMap.delete(filepath);
      this.warned = false;
    }

    // Clear any stale config before importing
    delete (globalThis as any).__teggVitestConfig;

    const result = await super.importFile(filepath, source);

    if (source === 'collect') {
      const rawConfig = (globalThis as any).__teggVitestConfig;
      if (rawConfig) {
        delete (globalThis as any).__teggVitestConfig;

        const config: TeggRunnerConfig = {
          restoreMocks: rawConfig.restoreMocks ?? true,
          getApp: rawConfig.getApp ?? defaultGetApp,
        };

        debugLog(`captured config for ${filepath}`);

        // Resolve app and await ready during collection
        try {
          const app = await config.getApp();
          if (app) {
            await app.ready();
            this.fileAppMap.set(filepath, { app, config });
            debugLog(`app ready for ${filepath}`);
          }
        } catch (err) {
          if (!this.warned) {
            this.warned = true;
            // eslint-disable-next-line no-console
            console.warn('[tegg-vitest] getApp failed, skip context injection.', err);
          }
        }
      }
    }

    return result;
  }

  async onBeforeRunSuite(suite: Suite): Promise<void> {
    if (isFileSuite(suite)) {
      const filepath = suite.filepath!;
      debugLog(`onBeforeRunSuite (file): ${filepath}`);

      const fileApp = this.fileAppMap.get(filepath);
      if (fileApp) {
        const { app, config } = fileApp;

        if (typeof app.mockContext === 'function' && app.ctxStorage) {
          const suiteCtx = app.mockContext(undefined, {
            mockCtxStorage: false,
            reuseCtxStorage: false,
          });

          app.ctxStorage.enterWith(suiteCtx);

          let suiteScope: HeldScope | null = null;
          if (typeof suiteCtx.beginModuleScope === 'function') {
            suiteScope = await createHeldScope(suiteCtx);
            debugLog('suite held scope created');
          }

          this.fileScopeMap.set(filepath, { app, config, suiteCtx, suiteScope });
          debugLog('file suite scope created');
        }
      }
    }

    await super.onBeforeRunSuite(suite);
  }

  async onAfterRunSuite(suite: Suite): Promise<void> {
    if (isFileSuite(suite)) {
      const filepath = suite.filepath!;
      debugLog(`onAfterRunSuite (file): ${filepath}`);

      const fileState = this.fileScopeMap.get(filepath);
      if (fileState) {
        await releaseHeldScope(fileState.suiteScope);
        this.fileScopeMap.delete(filepath);
      }
      this.fileAppMap.delete(filepath);
    }

    await super.onAfterRunSuite(suite);
  }

  async onBeforeTryTask(test: Task): Promise<void> {
    const filepath = getTaskFilepath(test);
    if (filepath) {
      const fileState = this.fileScopeMap.get(filepath);
      if (fileState) {
        // Release previous scope on retry to avoid leaks
        const existing = this.taskScopeMap.get(test.id);
        if (existing) {
          await releaseHeldScope(existing.testScope);
        }

        debugLog(`onBeforeTryTask: ${test.name}`);

        const testCtx = fileState.app.mockContext!(undefined, {
          mockCtxStorage: false,
          reuseCtxStorage: false,
        });

        fileState.app.ctxStorage!.enterWith(testCtx);

        let testScope: HeldScope | null = null;
        if (typeof testCtx.beginModuleScope === 'function') {
          testScope = await createHeldScope(testCtx);
          debugLog('test held scope created');
        }

        this.taskScopeMap.set(test.id, { testScope, filepath });
      }
    }

    await super.onBeforeTryTask(test);
  }

  async onAfterRunTask(test: Task): Promise<void> {
    const taskState = this.taskScopeMap.get(test.id);
    if (taskState) {
      debugLog(`onAfterRunTask: ${test.name}`);

      await releaseHeldScope(taskState.testScope);
      this.taskScopeMap.delete(test.id);

      const fileState = this.fileScopeMap.get(taskState.filepath);
      if (fileState) {
        await restoreEggMocksIfNeeded(fileState.config.restoreMocks);
        // Restore suite context
        fileState.app.ctxStorage!.enterWith(fileState.suiteCtx);
        debugLog('restored suite context');
      }
    }

    await super.onAfterRunTask(test);
  }
}
