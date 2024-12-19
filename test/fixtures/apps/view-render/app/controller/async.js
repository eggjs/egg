module.exports = app => {
  return class AsyncController extends app.Controller {
    async index() {
      const ctx = this.ctx;
      await ctx.render('index.html', {name: 'mk・2'});
    }
  }
};
