'use strict';

const fs = require('fs');
const path = require('path');
const sendToWormhole = require('stream-wormhole');

module.exports = function* () {
  const stream = yield this.getFileStream();
  let filepath = path.join(this.app.config.baseDir, `logs/${stream.filename}`);
  if (stream.fields.title === 'mock-error') {
    filepath = path.join(this.app.config.baseDir, `logs/not-exists/dir/${stream.filename}`);
  } else if (stream.fields.title === 'mock-read-error') {
    filepath = path.join(this.app.config.baseDir, `logs/read-error-${stream.filename}`);
  }
  this.logger.warn('Saving %s to %s', stream.filename, filepath);
  try {
    yield saveStream(stream, filepath);
  } catch (err) {
    yield sendToWormhole(stream);
    throw err;
  }

  this.body = {
    file: stream.filename,
    fields: stream.fields,
  };
};

function saveStream(stream, filepath) {
  return new Promise((resolve, reject) => {
    if (filepath.indexOf('/read-error-') > 0) {
      stream.once('readable', () => {
        const buf = stream.read(10240);
        console.log('read %d bytes', buf.length);
        setTimeout(() => {
          reject(new Error('mock read error'));
        }, 1000);
      });
    } else {
      const ws = fs.createWriteStream(filepath);
      stream.pipe(ws);
      ws.on('error', reject);
      ws.on('finish', resolve);
    }
  });
}
