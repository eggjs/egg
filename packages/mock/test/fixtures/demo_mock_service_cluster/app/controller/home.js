exports.get = function () {
  this.body = {
    cookieValue: this.getCookie('foo') || undefined,
    cookiesValue: this.cookies.get('foo') || undefined,
    sessionValue: this.session.foo,
  };
};

exports.post = function () {
  this.body = 'done';
};

exports.hello = function () {
  this.body = 'hi';
};

exports.service = async ctx => {
  ctx.body = {
    foo1: await ctx.service.foo.get(),
    foo2: await ctx.service.bar.foo.get(),
    foo3: ctx.service.foo.getSync(),
    thirdService: await ctx.service.third.bar.foo.get(),
  };
};

exports.serviceOld = async function () {
  this.body = await this.service.old.test();
};

exports.header = function () {
  this.body = {
    header: this.get('customheader'),
  };
};

exports.urllib = async function () {
  const url = 'http://' + this.host;
  const method = this.query.method || 'request';
  const data = this.query.data ? JSON.parse(this.query.data) : undefined;
  const dataType = this.query.dataType;
  let r = this.app.httpclient[method](url + '/mock_url', {
    dataType,
    data,
  });
  if (method === 'request') r = r.then(d => d);
  const r1 = await r;
  const r2 = await this.app.httpclient[method](url + '/mock_url', {
    method: 'POST',
    dataType,
    data,
    headers: {
      'x-custom': 'custom',
    },
  });
  this.body = {
    get: Buffer.isBuffer(r1.data) ? r1.data.toString() : r1.data,
    post: Buffer.isBuffer(r2.data) ? r2.data.toString() : r2.data,
  };
};

exports.mockUrlGet = function () {
  this.body = 'url get';
};

exports.mockUrlPost = async function () {
  this.body = 'url post';
};

exports.mockUrllibHeaders = async function () {
  const url = 'http://' + this.host;
  const method = this.query.method || 'request';
  const res = await this.app.httpclient[method](url + '/mock_url');
  this.body = res.headers;
};

exports.dataType = async function () {
  const url = 'http://' + this.host;
  const res = await this.app.httpclient.request(url + '/mock_url', {
    dataType: 'json',
  });
  this.body = res.data;
};
