module.exports = app => {
  class CustomController extends app.Controller {
    success(result) {
      this.ctx.body = {
        success: true,
        result,
      };
    }

    fail(message) {
      this.ctx.body = {
        success: false,
        message,
      };
    }
  }

  class CustomService extends app.Service {
    async getData() {
      return 'bar';
    }
  }

  app.Controller = CustomController;
  app.Service = CustomService;
};
