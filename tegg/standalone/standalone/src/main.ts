import { Runner, type RunnerOptions } from './Runner.ts';

export async function preLoad(cwd: string, dependencies?: RunnerOptions['dependencies']) {
  try {
    await Runner.preLoad(cwd, dependencies);
  } catch (e) {
    if (e instanceof Error) {
      e.message = `[tegg/standalone] bootstrap standalone preLoad failed: ${e.message}`;
    }
    throw e;
  }
}

export async function main<T = void>(cwd: string, options?: RunnerOptions): Promise<T> {
  const runner = new Runner(cwd, options);
  try {
    await runner.init();
  } catch (e) {
    if (e instanceof Error) {
      e.message = `[tegg/standalone] bootstrap tegg failed: ${e.message}`;
    }
    throw e;
  }
  try {
    return await runner.run<T>();
  } finally {
    runner.destroy().catch(e => {
      e.message = `[tegg/standalone] destroy tegg failed: ${e.message}`;
      console.warn(e);
    });
  }
}
