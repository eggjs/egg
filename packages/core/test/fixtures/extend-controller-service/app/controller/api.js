module.exports = app => {
  return class ApiController extends app.Controller {
    async successAction() {
      const res = await this.service.api.get();
      this.success({ foo: res });
    }

    async failAction() {
      this.fail('something wrong');
    }
  };
};
