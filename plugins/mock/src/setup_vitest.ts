import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest';

import { mock, type MockApplication } from './index.ts';

// Provide Mocha-compatible aliases so existing tests using before/after still work
// Vitest globals only inject beforeAll/afterAll, not Mocha's before/after
const g = globalThis as Record<string, unknown>;
if (!g.before) g.before = beforeAll;
if (!g.after) g.after = afterAll;
if (!g.beforeEach) g.beforeEach = beforeEach;
if (!g.afterEach) g.afterEach = afterEach;

// Signal that vitest setup is handling the lifecycle hooks,
// so setupApp() in app_handler.ts should skip registering duplicate hooks
(globalThis as Record<string, unknown>).__eggMockVitestSetup = true;

// Auto-configure @eggjs/tegg-vitest runner for context injection.
// The runner checks __teggVitestConfig to decide whether to create
// per-test tegg module scopes (so app.currentContext is available).
if (!(globalThis as Record<string, unknown>).__teggVitestConfig) {
  (globalThis as Record<string, unknown>).__teggVitestConfig = {
    restoreMocks: true,
    getApp: async () => {
      const bootstrap = await import('./bootstrap.ts');
      return (bootstrap as any)?.app;
    },
  };
}

let app: MockApplication | undefined;

// Cache the startup promise so that:
// 1. Only one startup attempt is made per worker
// 2. If startup fails, subsequent test files fail immediately
// 3. If startup hangs, all files share the same pending promise
let startupPromise: Promise<void> | undefined;

// Per-test tegg module scope state (used when @eggjs/tegg-vitest runner is NOT active)
let heldScopeEndFn: (() => void) | null = null;
let heldScopePromise: Promise<void> | null = null;
let suiteCtx: any = null;

beforeAll(async () => {
  if (!startupPromise) {
    startupPromise = (async () => {
      const { app: bootstrapApp } = await import('./bootstrap.ts');
      app = bootstrapApp;
      await app.ready();
    })();
    // Prevent unhandled promise rejection when startup fails
    // (the error will be re-thrown via await in each beforeAll)
    startupPromise.catch(() => {});
  }
  await startupPromise;

  // Create a suite-level context for tegg if the runner is not handling it.
  // The runner sets fileScopeMap entries; if it's not active we handle it here.
  if (app && typeof (app as any).mockContext === 'function' && (app as any).ctxStorage) {
    suiteCtx = (app as any).mockContext(undefined, {
      mockCtxStorage: false,
      reuseCtxStorage: false,
    });
    (app as any).ctxStorage.enterWith(suiteCtx);

    if (typeof suiteCtx.beginModuleScope === 'function') {
      let endScope!: () => void;
      const gate = new Promise<void>((resolve) => {
        endScope = resolve;
      });
      let ready!: () => void;
      const readyP = new Promise<void>((resolve) => {
        ready = resolve;
      });
      const scopeP = suiteCtx.beginModuleScope(async () => {
        ready();
        await gate;
      });
      await Promise.race([readyP, scopeP]);
      heldScopeEndFn = endScope;
      heldScopePromise = scopeP;
    }
  }
});

beforeEach(async () => {
  // Create a per-test context so app.currentContext is available
  if (app && typeof (app as any).mockContext === 'function' && (app as any).ctxStorage) {
    const testCtx = (app as any).mockContext(undefined, {
      mockCtxStorage: false,
      reuseCtxStorage: false,
    });
    (app as any).ctxStorage.enterWith(testCtx);

    if (typeof testCtx.beginModuleScope === 'function') {
      let endScope!: () => void;
      const gate = new Promise<void>((resolve) => {
        endScope = resolve;
      });
      let ready!: () => void;
      const readyP = new Promise<void>((resolve) => {
        ready = resolve;
      });
      const scopeP = testCtx.beginModuleScope(async () => {
        ready();
        await gate;
      });
      await Promise.race([readyP, scopeP]);

      // Store for cleanup in afterEach
      (globalThis as Record<string, unknown>).__eggTestScopeEnd = endScope;
      (globalThis as Record<string, unknown>).__eggTestScopePromise = scopeP;
    }
  }
});

afterEach(async () => {
  // Release per-test tegg module scope
  const endScope = (globalThis as Record<string, unknown>).__eggTestScopeEnd as (() => void) | undefined;
  const scopePromise = (globalThis as Record<string, unknown>).__eggTestScopePromise as Promise<void> | undefined;
  if (endScope) {
    endScope();
    await scopePromise;
    (globalThis as Record<string, unknown>).__eggTestScopeEnd = undefined;
    (globalThis as Record<string, unknown>).__eggTestScopePromise = undefined;
  }

  // Restore suite context
  if (suiteCtx && app && (app as any).ctxStorage) {
    (app as any).ctxStorage.enterWith(suiteCtx);
  }

  if (app && typeof app.backgroundTasksFinished === 'function') {
    await app.backgroundTasksFinished();
  }
  await mock.restore();
});

afterAll(async () => {
  // Release suite-level scope
  if (heldScopeEndFn) {
    heldScopeEndFn();
    await heldScopePromise;
    heldScopeEndFn = null;
    heldScopePromise = null;
  }
  suiteCtx = null;
  if (app) await app.close();
});
