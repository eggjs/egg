'use strict';

exports.userservice = {
  service: {
    getUserId(ctx) {
      return ctx.user && ctx.user.uid;
    },
    * getUser(ctx) {
      if (!ctx.query.uid || !ctx.query.name) {
        return null;
      }
      return {
        uid: ctx.query.uid,
        name: ctx.query.name,
      };
    },
  },
};
