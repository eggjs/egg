export default () => {
  return async (ctx: any, next: any) => {
    ctx.mid = 'from middleware';
    await next();
  };
};
