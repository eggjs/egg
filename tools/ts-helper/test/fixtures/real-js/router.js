/**
 * @param {import('egg').Application} app
 */
module.exports = app => {
  const { router, controller } = app;
  router.get('/', app.middleware.access, controller.home.index);
}