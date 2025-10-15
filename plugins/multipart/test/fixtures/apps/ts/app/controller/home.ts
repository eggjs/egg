import { Controller } from "egg";

class HomeController extends Controller {
  async index(): Promise<void> {
    const { ctx } = this;
    ctx.body = {
      body: ctx.request.body,
      files: ctx.request.files,
    };
  }
}

export default HomeController;
