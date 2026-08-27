exports.keys = 'cors-origin-function-test';
exports.cors = {
  async origin(ctx) {
    if (!ctx.get('origin')) return '';
    return 'eggjs.org';
  },
  credentials: true,
};
