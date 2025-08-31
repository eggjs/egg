'use strict';

module.exports = () => {
  return (ctx, next) => {
    ctx.foo = 'foo';
    return next();
  };
};
