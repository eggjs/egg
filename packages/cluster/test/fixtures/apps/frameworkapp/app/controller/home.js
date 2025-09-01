module.exports = async ctx => {
  ctx.body = {
    frameworkCore: !!ctx.app.framework,
    frameworkPlugin: !!ctx.app.custom,
    frameworkAgent: !!ctx.app.agent,
  };
};
