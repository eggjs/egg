import { Controller } from 'egg';
import pkg from 'egg/package.json' with { type: 'json' };

export default class EggController1 extends Controller {
  async hello() {
    this.ctx.body = `hello,  egg@${pkg.version}`;
  }
}
