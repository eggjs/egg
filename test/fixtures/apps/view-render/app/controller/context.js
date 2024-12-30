module.exports = async function () {
  await this.render('js.html', {
    context: {
      a: this.request.body.a
    }
  });
};
