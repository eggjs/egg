import type { Application } from 'egg';
import { createEngine } from '../../lib/engine.ts';
import type { NunjucksEnvironment } from '../../lib/environment.ts';

const NUNJUCKS = Symbol('app#nunjucks');

export default {
  /**
   * nunjucks environment
   * @see https://mozilla.github.io/nunjucks/api.html#environment
   */
  get nunjucks(): NunjucksEnvironment {
    const app = this as unknown as Application;
    if (!(app as any)[NUNJUCKS]) {
      (app as any)[NUNJUCKS] = createEngine(app);
    }
    return (app as any)[NUNJUCKS];
  },
};
