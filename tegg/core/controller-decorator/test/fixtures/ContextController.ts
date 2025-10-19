import { Context } from '../../src/index.ts';

export class ContextController {
  async hello(@Context() ctx: object): Promise<void> {
    console.log('ctx:', ctx);
  }
}
