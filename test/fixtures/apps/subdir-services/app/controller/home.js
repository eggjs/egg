module.exports = async function () {
  this.body = {
    user: await this.service.user.get('123'),
    cif: await this.service.cif.user.get('123cif'),
    bar1: await this.service.foo.bar.get('bar1name'),
    bar2: await this.service.foo.subdir.bar.get('bar2name'),
    'foo.subdir2.sub2': await this.service.foo.subdir2.sub2.get('bar3name'),
    subdir11bar: await this.service.foo.subdir1.subdir11.bar.get(),
    ok: await this.service.ok.get(),
    cmd: await this.service.certifyPersonal.mobileHi.doCertify.exec('hihi'),
    serviceIsSame: this.service.certifyPersonal === this.service.certifyPersonal,
    oldStyle: await this.service.oldStyle.url(this),
  };
};
