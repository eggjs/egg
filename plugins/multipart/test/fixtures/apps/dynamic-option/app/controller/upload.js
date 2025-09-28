'use strict';

module.exports = app => {
  return class extends app.Controller {
    async index(ctx) {
      try {
        const file = await ctx.saveRequestFiles({
          limits: {
            fileSize: 10000,
          },
        });
        ctx.body = file;
      } finally {
        await ctx.cleanupRequestFiles();
      }
    }
  };
};
