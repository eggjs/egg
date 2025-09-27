exports.keys = 'test key';

exports.security = {
  /**
   * disable methodnoallow
   */
  methodnoallow: {
    enable: false,
  },

  csrf: {
    ignore: [/^\/api\//, ctx => !!ctx.get('ignore-csrf')],
  },
};
