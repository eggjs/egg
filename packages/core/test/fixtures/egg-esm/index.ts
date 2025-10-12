import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { EggLoader, EggCore, type EggCoreInitOptions } from '../../../src/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class AppLoader extends EggLoader {
  async loadAll(): Promise<void> {
    await this.loadPlugin();
    await this.loadConfig();
    await this.loadApplicationExtend();
    await this.loadContextExtend();
    await this.loadRequestExtend();
    await this.loadResponseExtend();
    await this.loadCustomApp();
    await this.loadMiddleware();
    await this.loadService();
    await this.loadController();
    await this.loadRouter();
  }
}

export class Application extends EggCore {
  declare loader: AppLoader;

  constructor(options: EggCoreInitOptions = {}) {
    super(options);
    this.on('error', (err: any) => {
      console.error(err);
    });
  }

  protected override customEggPaths(): string[] {
    return [__dirname, ...super.customEggPaths()];
  }

  protected override customEggLoader(): typeof EggLoader {
    return AppLoader;
  }
}

export { type EggCoreInitOptions } from '../../../src/index.ts';
