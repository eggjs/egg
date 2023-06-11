'use strict';
const assert = require('assert');
const utils = require('../../../utils');

module.exports = app => {

  app.beforeStart(async () => {

    const urlAwaiter = utils.startLocalServer();
    const httpclient = app.httpclient;

    const reqTracers = [];
    const resTracers = [];

    httpclient.on('request', function (options) {
      reqTracers.push(options.args.tracer);
    });

    httpclient.on('response', function (options) {
      resTracers.push(options.req.args.tracer);
    });

    const url = await urlAwaiter;

    let res = await httpclient.request(url, {
      method: 'GET',
      timeout: 20000,
    });
    assert(res.status === 200);

    res = await httpclient.request('https://github.com', {
      method: 'GET',
      timeout: 20000,
    });

    assert(res.status === 200);

    res = await httpclient.request('https://www.npmjs.com', {
      method: 'GET',
      timeout: 20000,
    });
    assert(res.status === 200);

    assert(reqTracers.length === 3);
    assert(resTracers.length === 3);

    assert(reqTracers[0] === reqTracers[1]);
    assert(reqTracers[1] === reqTracers[2]);

    assert(resTracers[0] === reqTracers[2]);
    assert(resTracers[1] === resTracers[0]);
    assert(resTracers[2] === resTracers[1]);

    assert(reqTracers[0].traceId);
  });

  const done = app.readyCallback('ready');
  setTimeout(done, 5000);
};
