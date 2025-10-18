import { Application } from 'egg';

export default (app: Application) => {
  app.router.get('/config', app.controller.app.baseDir);
};
