/**
 * @returns {(ctx: import('egg').Context, next: any) => Promise<any>}
 */
module.exports = () => {
  return async (ctx, next) => {
    console.info(ctx.url);
    await next();
  }
}