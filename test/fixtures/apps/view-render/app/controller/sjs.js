module.exports = function* () {
  var view = 'sjs.html';
  yield this.render(view, {
    foo: '"hello"'
  });
};
