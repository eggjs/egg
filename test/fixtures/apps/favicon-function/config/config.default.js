exports.siteFile = {
  '/favicon.ico': (ctx) => {
    return `https://eggjs.org/function${ctx.path}`;
  }
}

exports.keys = 'foo';
