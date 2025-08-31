module.exports = function (app) {
  app.get('/', function* () {
    this.body = {
      user: yield this.proxy.user.get('123'),
      cif: yield this.proxy.cif.user.get('123cif'),
      bar1: yield this.proxy.foo.bar.get('bar1name'),
      bar2: yield this.proxy.foo.subdir.bar.get('bar2name'),
      'foo.subdir2.sub2': yield this.proxy.foo.subdir2.sub2.get('bar3name'),
      subdir11bar: !!this.proxy.foo.subdir1,
      ok: yield this.proxy.ok.get(),
      cmd: yield this.proxy.certifyPersonal.mobileHi.doCertify.exec('hihi'),
      proxyIsSame: this.proxy.certifyPersonal === this.proxy.certifyPersonal,
      oldStyle: yield this.proxy.oldStyle.url(this),
    };
  });
};
