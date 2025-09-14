import { Controller } from 'egg';
import { Foo } from '@/module/foo';
export default class HomeController extends Controller {
  public async index() {
    const obj: PlainObject = {};
    obj.text = 'hi, egg';
    this.ctx.body = obj.text;
  }

  async foo() {
    const instance = new Foo();
    this.ctx.body = instance.bar();
  }
}
