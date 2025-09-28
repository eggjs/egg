const path = require('node:path');
const fs = require('node:fs/promises');
const is = require('is-type-of');

async function readableToBytes(stream) {
  const chunks = [];
  let chunk;
  let totalLength = 0;
  for await (chunk of stream) {
    chunks.push(chunk);
    totalLength += chunk.length;
  }
  return Buffer.concat(chunks, totalLength);
}

module.exports = app => {
  // mock oss
  app.context.oss = {
    async put(name, stream) {
      const bytes = await readableToBytes(stream);
      return {
        name,
        url: 'http://mockoss.com/' + name,
        size: bytes.length,
        res: {
          status: 200,
        },
      };
    },
  };

  app.get('/', async ctx => {
    ctx.body = {
      app: is.object(ctx.app.oss),
      ctx: is.object(ctx.oss),
      putBucket: is.generatorFunction(ctx.oss.putBucket),
    };
  });

  app.get('/uploadtest', async ctx => {
    const name = 'egg-oss-test-upload-' + process.version + '-' + Date.now();
    ctx.body = await ctx.oss.put(name, fs.createReadStream(__filename));
  });

  app.get('/upload', async ctx => {
    ctx.set('x-csrf', ctx.csrf);
    ctx.body = 'hi';
    // await ctx.render('upload.html');
  });

  app.post('/upload', async ctx => {
    const stream = await ctx.getFileStream();
    const name = 'egg-multipart-test/' + process.version + '-' + Date.now() + '-' + path.basename(stream.filename);
    // 文件处理，上传到云存储等等
    const result = await ctx.oss.put(name, stream);
    ctx.body = {
      name: result.name,
      url: result.url,
      status: result.res.status,
      fields: stream.fields,
    };
  });

  app.post('/upload2', async ctx => {
    await ctx.getFileStream({ limits: { fileSize: '1kb' } });
    ctx.body = ctx.request.body;
  });

  app.post('/upload/async', 'async.async');

  app.post('/upload/allowEmpty', 'async.allowEmpty');
};
