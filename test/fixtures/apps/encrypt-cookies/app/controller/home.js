module.exports = function* () {
  var encrypt = this.getCookie('foo', {
    encrypt: true
  });
  var encryptWrong = this.getCookie('foo');
  var plain = this.getCookie('plain');
  this.setCookie('foo', 'bar 中文', {
    encrypt: true
  });
  this.setCookie('plain', 'text ok');
  this.body = {
    set: 'bar 中文',
    encrypt: encrypt,
    encryptWrong: encryptWrong,
    plain: plain,
  };
};
