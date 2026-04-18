import path from 'node:path';
import { ServiceWorkerApp, ServiceWorkerAppOptions } from '../src/ServiceWorkerApp.ts';
import { StandaloneTestUtil } from '@eggjs/module-test-util/StandaloneTestUtil';

export class TestUtils {
  static baseDir(name: string) {
    return path.join(__dirname, 'fixtures', name);
  }

  static async createApp(name: string, init?: ServiceWorkerAppOptions) {
    const app = new ServiceWorkerApp(TestUtils.baseDir(name), {
      ...init,
      env: 'unittest',
      name,
    });
    await app.init();

    return app;
  }

  static async createFetchApp(name: string, init?: ServiceWorkerAppOptions) {
    const app = await TestUtils.createApp(name, init);
    // Use port 0 to let the OS assign a free port
    const server = await StandaloneTestUtil.startHTTPServer('127.0.0.1', 0, {
      listener: e => app.handleEvent(e),
    });

    return { app, server };
  }
}
