import { Context } from '../../src/index.ts';

export class CustomContext extends Context {
  get state() {
    return { foo: 'bar' };
  }
}
