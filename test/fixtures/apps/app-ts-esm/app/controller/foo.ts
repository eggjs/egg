import { Controller, RequestObjectBody } from 'egg';

// add user controller and service
declare module 'egg' {
  interface IController {
    foo: FooController;
  }
}

// controller
export default class FooController extends Controller {
  async index() {
    this.ctx.body = 'ok';
  }
}
