import { Application } from 'egg';

export default (app: Application) => {
  app.router.get('/dynamicInject', app.controller.app.dynamicInject);
  app.router.get('/singletonDynamicInject', app.controller.app.singletonDynamicInject);
};
