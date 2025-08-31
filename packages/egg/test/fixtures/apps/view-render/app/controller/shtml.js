module.exports = async function () {
  var view = this.query.vm ? 'shtml.vm' : 'shtml.html';
  await this.render(view, {
    foo: '<img onload="xx"><h1>foo</h1>',
  });
};
