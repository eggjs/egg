import { Application } from "egg";

const router = (app: Application): void => {
  const { controller, router } = app;
  router.post("/:id", controller.home.create);
  router.patch("/:id", controller.home.update);
  router.delete("/:id", controller.home.delete);
  router.put("/:id", controller.home.put);
};

export default router;
