import { Application } from 'egg';

export default (app: Application) => {
  const { controller } = app;

  app.get('/', controller.home.index);
};
