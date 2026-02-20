import { defaultGetApp } from './shared.ts';
import type { TeggVitestAdapterOptions } from './shared.ts';

export type { EggMockApp, TeggVitestAdapterOptions } from './shared.ts';

/**
 * Configure the custom Vitest runner (used via globalThis.__teggVitestConfig).
 * Call this in a setupFile and set `runner` in vitest.config.ts to use the runner approach.
 */
export function configureTeggRunner(options: TeggVitestAdapterOptions = {}): void {
  (globalThis as any).__teggVitestConfig = {
    restoreMocks: options.restoreMocks ?? true,
    getApp: options.getApp ?? defaultGetApp,
  };
}
