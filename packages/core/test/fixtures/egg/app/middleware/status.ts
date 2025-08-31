export default function () {
  return (ctx: any, next: any) => {
    ctx.traceId = `trace:${Date.now()}`;
    if (ctx.path === '/status') {
      ctx.body = 'egg status';
      return;
    }

    return next();
  };
}
