module.exports = function* () {
  yield this.render('js.html', {
    context: {
      a: this.request.body.a
    }
  });
};
