export default function(app: Egg.Application) {
  const { router, controller } = app as any;

  console.info(app.custom.test.abc);
  router.get('/', controller.home.index);
}
