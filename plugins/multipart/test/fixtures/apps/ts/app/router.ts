import { Application } from 'egg';

export default (app: Application) => {
  const { controller } = app;
  app.post('/', controller.home.index);
};
