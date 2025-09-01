import { EggCore } from '../../../../../src/index.ts';

export default class Application extends EggCore {
  get appApplication() {
    return 'app application';
  }
}
