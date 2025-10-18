import type { Application } from 'egg';

import { NunjucksEnvironment } from './environment.ts';

/**
 * Create nunjucks environment
 * @param app - application instance
 * @returns nunjucks environment instance
 */
export function createEngine(app: Application): NunjucksEnvironment {
  const coreLogger = app.loggers.coreLogger;

  const viewPaths = app.config.view.root;
  coreLogger.info('[@eggjs/view-nunjucks] loading templates from %j', viewPaths);

  const config = app.config.nunjucks as any;
  config.noCache = !config.cache;
  delete config.cache;

  return new NunjucksEnvironment(app);
}
