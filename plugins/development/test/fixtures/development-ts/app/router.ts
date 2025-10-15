import { Application } from "egg";

const router = (app: Application): void => {
  app.get("/foo.js", async (ctx) => {
    ctx.body = "foo.js";
  });

  app.get("/foo", async (ctx) => {
    ctx.body = "foo";
  });
};

export default router;
