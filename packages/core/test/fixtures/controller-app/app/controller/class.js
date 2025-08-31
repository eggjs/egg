module.exports = class HomeController {
  constructor(ctx) {
    this.ctx = ctx;
  }

  callFunction() {
    this.ctx.body = 'done';
  }

  async callGeneratorFunction() {
    this.ctx.body = await this.ctx.service.home.info();
  }

  async callGeneratorFunctionWithArg(ctx) {
    ctx.body = await ctx.service.home.info();
  }

  async callAsyncFunction() {
    this.ctx.body = await this.ctx.service.home.info();
  }

  async callAsyncFunctionWithArg(ctx) {
    ctx.body = await ctx.service.home.info();
  }

  // won't be loaded
  get nofunction() {
    return 'done';
  }

  get request() {
    return this.ctx.request;
  }

  set body(val) {
    this.ctx.body = val;
  }
};
