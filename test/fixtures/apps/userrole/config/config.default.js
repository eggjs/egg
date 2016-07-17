exports.userservice = {
  service: {
    * getUser(ctx) {
      if (!ctx.query.name) {
        return null;
      }
      return {
        name: ctx.query.name,
      };
    },
  },
};

exports.keys = 'foo';
