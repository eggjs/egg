import { StandaloneApp, type StandaloneAppOptions } from './StandaloneApp.ts';

export async function preLoad(cwd: string, dependencies?: StandaloneAppOptions['dependencies']): Promise<void> {
  try {
    await StandaloneApp.preLoad(cwd, dependencies);
  } catch (e) {
    if (e instanceof Error) {
      e.message = `[tegg/standalone] bootstrap standalone preLoad failed: ${e.message}`;
    }
    throw e;
  }
}

export async function main<T = void>(cwd: string, options?: StandaloneAppOptions): Promise<T> {
  const app = new StandaloneApp(cwd, options);
  try {
    await app.init();
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
    return await app.run<T>();
  } finally {
    app.destroy().catch((e) => {
      e.message = `[tegg/standalone] destroy tegg failed: ${e.message}`;
      console.warn(e);
    });
  }
}
