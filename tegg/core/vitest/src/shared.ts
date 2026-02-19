import type { AsyncLocalStorage } from 'node:async_hooks';

import type { Application } from 'egg';

export type EggMockApp = Application & {
  // egg-mock ctx API
  ctxStorage?: {
    getStore?: () => any;
    enterWith?: (store: any) => void;
  } & AsyncLocalStorage<any>;

  mockContext?: (data?: any, options?: any) => any;
};

export interface TeggVitestAdapterOptions {
  /**
   * Resolve app instance.
   * Default: import('@eggjs/mock/bootstrap').app
   */
  getApp?: () => Promise<EggMockApp | undefined> | EggMockApp | undefined;

  /**
   * Restore mocks after each test.
   * Default: true (calls @eggjs/mock.restore())
   */
  restoreMocks?: boolean;
}

export const DEBUG_ENABLED = process.env.DEBUG_TEGG_VITEST === '1';

export function debugLog(message: string, extra?: unknown) {
  if (!DEBUG_ENABLED) return;
  if (extra === undefined) {
    // eslint-disable-next-line no-console
    console.log(`[tegg-vitest] ${message}`);
    return;
  }
  // eslint-disable-next-line no-console
  console.log(`[tegg-vitest] ${message}`, extra);
}

export async function defaultGetApp(): Promise<EggMockApp | undefined> {
  const bootstrap = await import('@eggjs/mock/bootstrap');
  return (bootstrap as any)?.app;
}

export async function restoreEggMocksIfNeeded(restoreMocks: boolean) {
  if (!restoreMocks) return;
  const eggMock = await import('@eggjs/mock');
  const mm = (eggMock as any)?.default || eggMock;
  if (mm?.restore) {
    await mm.restore();
  }
}
