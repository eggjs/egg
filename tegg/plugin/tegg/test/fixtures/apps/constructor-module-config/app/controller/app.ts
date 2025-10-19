import { Controller } from 'egg';

export default class App extends Controller {
  async baseDir(): Promise<void> {
    this.ctx.body = {
      foo: this.app.module.constructorSimple.foo.foo,
      bar: this.app.module.constructorSimple.foo.bar,
    };
  }
}
