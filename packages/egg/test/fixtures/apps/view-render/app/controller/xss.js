module.exports = async function () {
  await this.render('xss.html', {
    url: 'http://alipay.com/index.html?a=<div>',
    html: '<div id="a">\'a\'</div>'
  });
};
