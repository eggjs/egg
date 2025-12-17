'use strict';

exports.index = async function(ctx) {
  const r = await ctx.fetch(ctx.query.url);
  const data = await r.json();
  ctx.body = {
    url: ctx.query.url,
    data,
  };
};
