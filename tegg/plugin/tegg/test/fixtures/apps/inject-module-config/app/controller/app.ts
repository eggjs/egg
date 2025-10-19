import { Controller } from 'egg';

import { Foo } from '../../modules/module-with-config/foo.ts';
import { Bar } from '../../modules/module-with-overwrite-config/bar.ts';

export default class App extends Controller {
  async baseDir(): Promise<void> {
    const simple = await this.ctx.app.getEggObject<Foo>(Foo);
    const configs = await simple.getConfig();
    this.ctx.body = configs;
  }

  async overwriteConfig(): Promise<void> {
    const bar = await this.ctx.app.getEggObject<Bar>(Bar);
    const configs = await bar.getConfig();
    this.ctx.body = configs;
  }
}
