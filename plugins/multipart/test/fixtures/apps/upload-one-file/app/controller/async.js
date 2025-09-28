'use strict';

const path = require('path');
const { Controller } = require('egg');

module.exports = class UploadController extends Controller {
  async async() {
    const ctx = this.ctx;
    const options = {};
    if (ctx.query.fileSize) {
      options.limits = { fileSize: parseInt(ctx.query.fileSize) };
    }
    const stream = await ctx.getFileStream(options);
    if (ctx.query.foo === 'error') {
      // mock undefined error
      stream.foo();
    }
    const name = 'egg-multipart-test/' + process.version + '-' + Date.now() + '-' + path.basename(stream.filename);
    const result = await ctx.oss.put(name, stream);
    ctx.body = {
      name: result.name,
      url: result.url,
      status: result.res.status,
      fields: stream.fields,
    };
  }

  async allowEmpty() {
    const ctx = this.ctx;
    const stream = await ctx.getFileStream({ requireFile: false });
    if (stream.filename) {
      const name = 'egg-multipart-test/' + process.version + '-' + Date.now() + '-' + path.basename(stream.filename);
      const result = await ctx.oss.put(name, stream);
      ctx.body = {
        name: result.name,
        url: result.url,
        status: result.res.status,
        fields: stream.fields,
      };
      return;
    }

    stream.resume();
    ctx.body = {
      fields: stream.fields,
    };
  }
};
