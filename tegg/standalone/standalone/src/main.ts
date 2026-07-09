import type { EggContext } from '@eggjs/tegg-runtime';

import {
  StandaloneApp,
  type InitStandaloneAppOptions,
  type StandaloneAppInit,
  type StandaloneAppOptions,
} from './StandaloneApp.ts';

export async function preLoad(
  cwd: string,
  dependencies?: StandaloneAppOptions['dependencies'],
  frameworkDeps?: StandaloneAppOptions['frameworkDeps'],
): Promise<void> {
  try {
    await StandaloneApp.preLoad(cwd, dependencies, frameworkDeps);
  } catch (e) {
    if (e instanceof Error) {
      e.message = `[tegg/standalone] bootstrap standalone preLoad failed: ${e.message}`;
    }
    throw e;
  }
}

export async function appMain<T = void>(
  options: InitStandaloneAppOptions,
  init?: StandaloneAppInit,
  ctx?: EggContext,
): Promise<T> {
  const app = new StandaloneApp(init);
  try {
    await app.init(options);
  } catch (e) {
    if (e instanceof Error) {
      e.message = `[tegg/standalone] bootstrap tegg failed: ${e.message}`;
    }
    // Boot failed and run()'s finally below is never reached, so tear down here
    // to release this app's TeggScope so it does not leak into liveScopeBags.
    await app.destroy().catch(() => {
      /* swallow: surface the original boot error */
    });
    throw e;
  }
  try {
    return await app.run<T>(ctx);
  } finally {
    await app.destroy().catch((e: unknown) => {
      if (e instanceof Error) {
        e.message = `[tegg/standalone] destroy tegg failed: ${e.message}`;
        console.warn(e);
        return;
      }
      console.warn('[tegg/standalone] destroy tegg failed:', e);
    });
  }
}

export async function main<T = void>(cwd: string, options?: StandaloneAppOptions): Promise<T> {
  if (options && 'innerObjects' in options) {
    throw new Error('[tegg/standalone] options.innerObjects has been removed, use options.innerObjectHandlers instead');
  }
  return await appMain<T>(
    {
      baseDir: cwd,
      name: options?.name,
      env: options?.env,
      dependencies: options?.dependencies,
      manifest: options?.manifest,
      loaderFS: options?.loaderFS,
    },
    {
      frameworkDeps: options?.frameworkDeps,
      dump: options?.dump,
      innerObjects: options?.innerObjectHandlers,
      innerObjectsName: 'innerObjectHandlers',
      logger: options?.logger,
    },
  );
}
