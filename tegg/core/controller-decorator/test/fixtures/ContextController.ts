import { HTTPContext } from '../../src/index.ts';

export class ContextController {
  async hello(@HTTPContext() ctx: object): Promise<void> {
    console.log('ctx:', ctx);
  }
}
