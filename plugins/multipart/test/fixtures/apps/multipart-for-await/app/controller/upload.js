'use strict';

const path = require('path');
const { Controller } = require('egg');
const stream = require('stream');
const util = require('util');
const pipeline = util.promisify(stream.pipeline);

module.exports = class UploadController extends Controller {
  async index() {
    const shouldMockError = !!this.ctx.query.mock_error;
    const fileSize = parseInt(this.ctx.query.fileSize) || this.app.config.multipart.fileSize;

    const parts = this.ctx.multipart({ limits: { fileSize } });
    const fields = {};
    const files = {};

    for await (const part of parts) {
      if (Array.isArray(part)) {
        const [name, value] = part;
        fields[name] = value;
      } else {
        const { filename, fieldname } = part;

        let content = '';
        await pipeline(
          part,
          new stream.Writable({
            write(chunk, encoding, callback) {
              content += chunk.toString();
              // console.log('@@', part.filename, part.truncated);
              if (shouldMockError) {
                return callback(new Error('mock error'));
              }
              setImmediate(callback);
            },
          })
        );
        files[fieldname] = {
          fileName: filename,
          content,
        };
      }
    }

    this.ctx.body = { fields, files };
  }
};
