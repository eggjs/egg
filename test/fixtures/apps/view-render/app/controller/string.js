module.exports = function* () {
  this.body = yield this.renderString('{{ context.a }}', {
    context: {
      a: 'templateString'
    }
  });
};
