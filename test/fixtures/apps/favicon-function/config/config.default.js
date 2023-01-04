exports.siteFile = {
  '/favicon.ico': async (ctx) => {
    return `https://eggjs.org/function${ctx.path}`;
  }
}

exports.keys = 'foo';
