import { Application } from 'egg';

const router = (app: Application): void => {
  app.get('/', 'home.index');
};

export default router;
