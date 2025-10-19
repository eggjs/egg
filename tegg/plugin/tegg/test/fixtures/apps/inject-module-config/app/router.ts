import type { Application } from 'egg';

export default (app: Application): void => {
  app.router.get('/config', app.controller.app.baseDir);
  app.router.get('/overwrite_config', app.controller.app.overwriteConfig);
};
