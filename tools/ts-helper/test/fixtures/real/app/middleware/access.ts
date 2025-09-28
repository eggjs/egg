export default () => {
  return async (_ctx, next) => {
    await next();
  };
};
