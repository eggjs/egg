module.exports = function* () {
  this.body = {
    user: yield this.service.user.get('123'),
    cif: yield this.service.cif.user.get('123cif'),
    bar1: yield this.service.foo.bar.get('bar1name'),
    bar2: yield this.service.foo.subdir.bar.get('bar2name'),
    'foo.subdir2.sub2': yield this.service.foo.subdir2.sub2.get('bar3name'),
    subdir11bar: yield this.service.foo.subdir1.subdir11.bar.get(),
    ok: yield this.service.ok.get(),
    cmd: yield this.service.certifyPersonal.mobileHi.doCertify.exec('hihi'),
    serviceIsSame: this.service.certifyPersonal === this.service.certifyPersonal,
    oldStyle: yield this.service.oldStyle.url(this),
  };
};
