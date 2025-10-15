import { Application } from "egg";

export default (app: Application): void => {
  const { controller } = app;
  app.post("/", controller.home.index);
};
