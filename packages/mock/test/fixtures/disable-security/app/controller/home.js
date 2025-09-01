exports.get = async function() {
  this.body = {
    cookieValue: this.getCookie('foo') || undefined,
    cookiesValue: this.cookies.get('foo') || undefined,
    sessionValue: this.session.foo,
  };
};

exports.post = async function() {
  this.body = 'done';
};

exports.hello = async function() {
  this.body = 'hi';
};

exports.service = async function() {
  this.body = {
    foo1: await this.service.foo.get(),
    foo2: await this.service.bar.foo.get(),
    foo3: this.service.foo.getSync(),
    thirdService: await this.service.third.bar.foo.get(),
  };
};

exports.serviceOld = async function() {
  this.body = await this.service.old.test();
};

exports.header = async function() {
  this.body = {
    header: this.get('customheader'),
  };
};

exports.urllib = async function() {
  const url = 'http://' + this.host;
  const method = this.query.method || 'request';
  const dataType = this.query.dataType;
  let r = this.app.httpclient[method](url + '/mock_url', {
    dataType,
  });
  if (method === 'request') r = r.then(d => d);
  const r1 = await r;
  const r2 = await this.app.httpclient[method](url + '/mock_url', {
    method: 'POST',
    dataType,
  });
  this.body = {
    get: Buffer.isBuffer(r1.data) ? r1.data.toString() : r1.data,
    post: Buffer.isBuffer(r2.data) ? r2.data.toString() : r2.data,
  };
};

exports.mockUrlGet = async function() {
  this.body = 'url get';
};

exports.mockUrlPost = async function() {
  this.body = 'url post';
};

exports.mockUrllibHeaders = async function() {
  const url = 'http://' + this.host;
  const method = this.query.method || 'request';
  const res = await this.app.httpclient[method](url + '/mock_url');
  this.body = res.headers;
};
