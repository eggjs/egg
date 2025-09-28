# @eggjs/multipart

[![NPM version][npm-image]][npm-url]
[![Known Vulnerabilities][snyk-image]][snyk-url]
[![npm download][download-image]][download-url]
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](https://makeapullrequest.com)
![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/eggjs/multipart)

[npm-image]: https://img.shields.io/npm/v/@eggjs/multipart.svg?style=flat-square
[npm-url]: https://npmjs.org/package/@eggjs/multipart
[snyk-image]: https://snyk.io/test/npm/@eggjs/multipart/badge.svg?style=flat-square
[snyk-url]: https://snyk.io/test/npm/@eggjs/multipart
[download-image]: https://img.shields.io/npm/dm/@eggjs/multipart.svg?style=flat-square
[download-url]: https://npmjs.org/package/@eggjs/multipart

Use [co-busboy](https://github.com/cojs/busboy) to upload file by streaming and
process it without save to disk(using the `stream` mode).

Just use `ctx.multipart()` to got file stream, then pass to image processing module such as `gm` or upload to cloud storage such as `oss`.

## Whitelist of file extensions

For security, if uploading file extension is not in white list, will response as `400 Bad request`.

Default Whitelist:

```js
const whitelist = [
  // images
  '.jpg',
  '.jpeg', // image/jpeg
  '.png', // image/png, image/x-png
  '.gif', // image/gif
  '.bmp', // image/bmp
  '.wbmp', // image/vnd.wap.wbmp
  '.webp',
  '.tif',
  '.psd',
  // text
  '.svg',
  '.js',
  '.jsx',
  '.json',
  '.css',
  '.less',
  '.html',
  '.htm',
  '.xml',
  // tar
  '.zip',
  '.gz',
  '.tgz',
  '.gzip',
  // video
  '.mp3',
  '.mp4',
  '.avi',
];
```

### fileSize

The default fileSize that multipart can accept is `10mb`. if you upload a large file, you should specify this config.

```js
// config/config.default.js
exports.multipart = {
  fileSize: '50mb',
};
```

### Custom Config

Developer can custom additional file extensions:

```js
// config/config.default.js
exports.multipart = {
  // will append to whilelist
  fileExtensions: ['.foo', '.apk'],
};
```

Can also **override** built-in whitelist, such as only allow png:

```js
// config/config.default.js
exports.multipart = {
  whitelist: ['.png'],
};
```

Or by function：

```js
exports.multipart = {
  whitelist: filename => ['.png'].includes(path.extname(filename) || ''),
};
```

**Note: if define `whitelist`, then `fileExtensions` will be ignored.**

## Examples

More examples please follow:

- [Handle multipart request in `stream` mode](https://github.com/eggjs/examples/tree/master/multipart)
- [Handle multipart request in `file` mode](https://github.com/eggjs/examples/tree/master/multipart-file-mode)

## `file` mode: the easy way

If you don't know the [Node.js Stream](https://nodejs.org/dist/latest-v18.x/docs/api/stream.html) work,
maybe you should use the `file` mode to get started.

The usage very similar to [bodyParser](https://eggjs.org/en/basics/controller.html#body).

- `ctx.request.body`: Get all the multipart fields and values, except `file`.
- `ctx.request.files`: Contains all `file` from the multipart request, it's an Array object.

**WARNING: you should remove the temporary upload files after you use it**,
the `async ctx.cleanupRequestFiles()` method will be very helpful.

### Enable `file` mode on config

You need to set `config.multipart.mode = 'file'` to enable `file` mode:

```js
// config/config.default.js
exports.multipart = {
  mode: 'file',
};
```

After `file` mode enable, egg will remove the old temporary files(don't include today's files) on `04:30 AM` every day by default.

```js
config.multipart = {
  mode: 'file',
  tmpdir: path.join(os.tmpdir(), 'egg-multipart-tmp', appInfo.name),
  cleanSchedule: {
    // run tmpdir clean job on every day 04:30 am
    // cron style see https://github.com/eggjs/egg-schedule#cron-style-scheduling
    cron: '0 30 4 * * *',
    disable: false,
  },
};
```

Default will use the last field which has same name, if need the all fields value, please set `allowArrayField` in config.

```js
// config/config.default.js
exports.multipart = {
  mode: 'file',
  allowArrayField: true,
};
```

### Upload One File

```html
<form method="POST" action="/upload?_csrf={{ ctx.csrf | safe }}" enctype="multipart/form-data">
  title: <input name="title" /> file: <input name="file" type="file" />
  <button type="submit">Upload</button>
</form>
```

Controller which hanlder `POST /upload`:

```js
// app/controller/upload.js
const Controller = require('egg').Controller;
const fs = require('mz/fs');

module.exports = class extends Controller {
  async upload() {
    const { ctx } = this;
    const file = ctx.request.files[0];
    const name = 'egg-multipart-test/' + path.basename(file.filename);
    let result;
    try {
      // process file or upload to cloud storage
      result = await ctx.oss.put(name, file.filepath);
    } finally {
      // remove tmp files and don't block the request's response
      // cleanupRequestFiles won't throw error even remove file io error happen
      ctx.cleanupRequestFiles();
      // remove tmp files before send response
      // await ctx.cleanupRequestFiles();
    }

    ctx.body = {
      url: result.url,
      // get all field values
      requestBody: ctx.request.body,
    };
  }
};
```

### Upload Multiple Files

```html
<form method="POST" action="/upload?_csrf={{ ctx.csrf | safe }}" enctype="multipart/form-data">
  title: <input name="title" /> file1: <input name="file1" type="file" /> file2: <input name="file2" type="file" />
  <button type="submit">Upload</button>
</form>
```

Controller which hanlder `POST /upload`:

```js
// app/controller/upload.js
const Controller = require('egg').Controller;
const fs = require('mz/fs');

module.exports = class extends Controller {
  async upload() {
    const { ctx } = this;
    console.log(ctx.request.body);
    console.log('got %d files', ctx.request.files.length);
    for (const file of ctx.request.files) {
      console.log('field: ' + file.fieldname);
      console.log('filename: ' + file.filename);
      console.log('encoding: ' + file.encoding);
      console.log('mime: ' + file.mime);
      console.log('tmp filepath: ' + file.filepath);
      let result;
      try {
        // process file or upload to cloud storage
        result = await ctx.oss.put('egg-multipart-test/' + file.filename, file.filepath);
      } finally {
        // remove tmp files and don't block the request's response
        // cleanupRequestFiles won't throw error even remove file io error happen
        ctx.cleanupRequestFiles([file]);
      }
      console.log(result);
    }
  }
};
```

## `stream` mode: the hard way

If you're well-known about know the Node.js Stream work, you should use the `stream` mode.

### Use with `for await...of`

```html
<form method="POST" action="/upload?_csrf={{ ctx.csrf | safe }}" enctype="multipart/form-data">
  title: <input name="title" /> file1: <input name="file1" type="file" /> file2: <input name="file2" type="file" />
  <button type="submit">Upload</button>
</form>
```

Controller which hanlder `POST /upload`:

```js
// app/controller/upload.js
const { Controller } = require('egg');
const fs = require('fs');
const stream = require('stream');
const util = require('util');
const { randomUUID } = require('crypto');
const pipeline = util.promisify(stream.pipeline);

module.exports = class UploadController extends Controller {
  async upload() {
    const parts = this.ctx.multipart();
    const fields = {};
    const files = {};

    for await (const part of parts) {
      if (Array.isArray(part)) {
        // fields
        console.log('field: ' + part[0]);
        console.log('value: ' + part[1]);
      } else {
        // otherwise, it's a stream
        const { filename, fieldname, encoding, mime } = part;

        console.log('field: ' + fieldname);
        console.log('filename: ' + filename);
        console.log('encoding: ' + encoding);
        console.log('mime: ' + mime);

        // how to handler?
        // 1. save to tmpdir with pipeline
        // 2. or send to oss
        // 3. or just consume it with another for await

        // WARNING: You should almost never use the origin filename as it could contain malicious input.
        const targetPath = path.join(os.tmpdir(), randomUUID() + path.extname(filename));
        await pipeline(part, createWriteStream(targetPath)); // use `pipeline` not `pipe`
      }
    }

    this.ctx.body = 'ok';
  }
};
```

### Upload One File (DEPRECATED)

You can got upload stream by `ctx.getFileStream*()`.

```html
<form method="POST" action="/upload?_csrf={{ ctx.csrf | safe }}" enctype="multipart/form-data">
  title: <input name="title" /> file: <input name="file" type="file" />
  <button type="submit">Upload</button>
</form>
```

Controller which handler `POST /upload`:

```js
// app/controller/upload.js
const path = require('node:path');
const { sendToWormhole } = require('stream-wormhole');
const { Controller } = require('egg');

module.exports = class extends Controller {
  async upload() {
    const { ctx } = this;
    // file not exists will response 400 error
    const stream = await ctx.getFileStream();
    const name = 'egg-multipart-test/' + path.basename(stream.filename);
    // process file or upload to cloud storage
    const result = await ctx.oss.put(name, stream);

    ctx.body = {
      url: result.url,
      // process form fields by `stream.fields`
      fields: stream.fields,
    };
  }

  async uploadNotRequiredFile() {
    const { ctx } = this;
    // file not required
    const stream = await ctx.getFileStream({ requireFile: false });
    let result;
    if (stream.filename) {
      const name = 'egg-multipart-test/' + path.basename(stream.filename);
      // process file or upload to cloud storage
      const result = await ctx.oss.put(name, stream);
    } else {
      // must consume the empty stream
      await sendToWormhole(stream);
    }

    ctx.body = {
      url: result && result.url,
      // process form fields by `stream.fields`
      fields: stream.fields,
    };
  }
};
```

### Upload Multiple Files (DEPRECATED)

```html
<form method="POST" action="/upload?_csrf={{ ctx.csrf | safe }}" enctype="multipart/form-data">
  title: <input name="title" /> file1: <input name="file1" type="file" /> file2: <input name="file2" type="file" />
  <button type="submit">Upload</button>
</form>
```

Controller which hanlder `POST /upload`:

```js
// app/controller/upload.js
const Controller = require('egg').Controller;

module.exports = class extends Controller {
  async upload() {
    const { ctx } = this;
    const parts = ctx.multipart();
    let part;
    while ((part = await parts()) != null) {
      if (part.length) {
        // arrays are busboy fields
        console.log('field: ' + part[0]);
        console.log('value: ' + part[1]);
        console.log('valueTruncated: ' + part[2]);
        console.log('fieldnameTruncated: ' + part[3]);
      } else {
        if (!part.filename) {
          // user click `upload` before choose a file,
          // `part` will be file stream, but `part.filename` is empty
          // must handler this, such as log error.
          continue;
        }
        // otherwise, it's a stream
        console.log('field: ' + part.fieldname);
        console.log('filename: ' + part.filename);
        console.log('encoding: ' + part.encoding);
        console.log('mime: ' + part.mime);
        const result = await ctx.oss.put('egg-multipart-test/' + part.filename, part);
        console.log(result);
      }
    }
    console.log('and we are done parsing the form!');
  }
};
```

### Support `file` and `stream` mode in the same time

If the default `mode` is `stream`, use the `fileModeMatch` options to match the request urls switch to `file` mode.

```js
config.multipart = {
  mode: 'stream',
  // let POST /upload_file request use the file mode, other requests use the stream mode.
  fileModeMatch: /^\/upload_file$/,
  // or glob
  // fileModeMatch: '/upload_file',
};
```

NOTICE: `fileModeMatch` options only work on `stream` mode.

## License

[MIT](LICENSE)

## Contributors

[![Contributors](https://contrib.rocks/image?repo=eggjs/egg)](https://github.com/eggjs/egg/graphs/contributors)

Made with [contributors-img](https://contrib.rocks).
