module.exports = async function () {
  this.body = await this.renderString('{{ context.a }}', {
    context: {
      a: 'templateString'
    }
  });
};
