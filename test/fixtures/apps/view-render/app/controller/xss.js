module.exports = function* () {
  yield this.render('xss.html', {
    url: 'http://alipay.com/index.html?a=<div>',
    html: '<div id="a">\'a\'</div>'
  });
};
