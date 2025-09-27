module.exports = app => {
  return class Home extends app.Controller {
    async index() {
      this.ctx.body = 'hello csrfToken';
    }
  };
};
