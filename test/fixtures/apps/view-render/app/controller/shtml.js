module.exports = function* () {
  var view = this.query.vm ? 'shtml.vm' : 'shtml.html';
  yield this.render(view, {
    foo: '<img onload="xx"><h1>foo</h1>',
  });
};
