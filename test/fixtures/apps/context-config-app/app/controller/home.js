'use strict';

exports.index = async ctx => {
  const router = ctx.router;
  // set router ok too
  ctx.router = router;
  ctx.body = {
    path: ctx.router.pathFor('home'),
    foo: ctx.foo,
    bar: ctx.bar()
  };
};
