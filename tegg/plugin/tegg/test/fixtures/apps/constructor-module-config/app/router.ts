import { Application } from 'egg';

export default (app: Application): void => {
  app.router.get('/config', app.controller.app.baseDir);
};
