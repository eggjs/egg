module.exports = async ctx => {
  ctx.body = await ctx.app.sessionCache.getSessionById('mock-session-id-123');
};
