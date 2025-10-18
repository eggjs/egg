import { Application } from 'egg';

import { createEngine } from '../../lib/engine.ts';
import type { NunjucksEnvironment } from '../../lib/environment.ts';

const NUNJUCKS = Symbol('app#nunjucks');

export default class NunjucksApplication extends Application {
  /**
   * nunjucks environment
   * @see https://mozilla.github.io/nunjucks/api.html#environment
   */
  get nunjucks(): NunjucksEnvironment {
    if (!this[NUNJUCKS]) {
      this[NUNJUCKS] = createEngine(this);
    }
    return this[NUNJUCKS] as NunjucksEnvironment;
  }
}
