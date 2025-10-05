import { Application } from 'egg';

export default (app: Application) => {
  const { controller, router } = app;
  router.post('/:id', controller.home.create);
  router.patch('/:id', controller.home.update);
  router.delete('/:id', controller.home.delete);
  router.put('/:id', controller.home.put);
};
