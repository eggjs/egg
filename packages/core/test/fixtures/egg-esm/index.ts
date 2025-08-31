import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EggLoader, EggCore, EggCoreInitOptions } from '../../../src/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class AppLoader extends EggLoader {
  async loadAll() {
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

  get [Symbol.for('egg#eggPath')]() {
    return __dirname;
  }
  get [Symbol.for('egg#loader')]() {
    return AppLoader;
  }
}

export { EggCoreInitOptions } from '../../../src/index.js';
