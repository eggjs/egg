import { Context } from '../../src/index.js';

export class ContextController {
  async hello(@Context() ctx: object) {
    console.log('ctx:', ctx);
  }
}
