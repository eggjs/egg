import { Context } from '../../../../../src/index.ts';

export default class MyContext extends Context {
  get appContext() {
    return this.app ? 'app context' : 'no app context';
  }

  ajax() {
    return 'app ajax patch';
  }
}
