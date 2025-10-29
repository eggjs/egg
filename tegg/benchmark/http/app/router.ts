import type { Application } from 'egg';

export default (app: Application) => {
  app.get('/hello-egg', app.controller.template.eggController_1.hello);
};
