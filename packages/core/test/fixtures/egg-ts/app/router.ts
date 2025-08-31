module.exports = (app: any) => {
  const { router, controller } = app;
  router.get('/', controller.home);
};
