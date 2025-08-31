module.exports = {
  callFunction() {
    this.body = 'done';
  },

  async callGeneratorFunction() {
    this.body = await this.service.home.info();
  },

  async callGeneratorFunctionWithArg(ctx) {
    ctx.body = await ctx.service.home.info();
  },

  subObject: {
    async callGeneratorFunction() {
      this.body = await this.service.home.info();
    },
    subSubObject: {
      async callGeneratorFunction() {
        this.body = await this.service.home.info();
      },
    },
  },

  async callAsyncFunction() {
    this.body = await this.service.home.info();
  },

  async callAsyncFunctionWithArg(ctx) {
    ctx.body = await ctx.service.home.info();
  },

  get nofunction() {
    return 'done';
  },
};
