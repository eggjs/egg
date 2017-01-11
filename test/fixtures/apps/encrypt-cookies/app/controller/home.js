module.exports = function* () {
  var encrypt = this.cookies.get('foo', {
    encrypt: true
  });
  var encryptWrong = this.cookies.get('foo', { signed: false });
  var plain = this.cookies.get('plain', { signed: false });
  this.cookies.set('foo', 'bar 中文', {
    encrypt: true
  });
  this.cookies.set('plain', 'text ok', { signed: false });
  this.body = {
    set: 'bar 中文',
    encrypt: encrypt,
    encryptWrong: encryptWrong,
    plain: plain,
  };
};
