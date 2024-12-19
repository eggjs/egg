module.exports = async function () {
  var view = 'sjs.html';
  await this.render(view, {
    foo: '"hello"'
  });
};
