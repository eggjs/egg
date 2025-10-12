import { Application } from 'egg';

const setupRouter = (app: Application): void => {
  const { controller } = app;

  app.get('/', controller.home.index);
};

export default setupRouter;
