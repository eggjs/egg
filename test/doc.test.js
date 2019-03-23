'use strict';

const path = require('path');
const findlinks = require('findlinks');
const assert = require('assert');
const runscript = require('runscript');
const utils = require('./utils');

describe('test/doc.test.js', () => {
  if (process.platform === 'win32') return;

  let app;
  before(async () => {
    await runscript('doctools build', { cwd: path.dirname(__dirname) });
  });
  before(async () => {
    app = utils.cluster({
      baseDir: 'apps/docapp',
    });
    app.coverage(false);
    await app.ready();
  });
  after(() => app.close());

  it('should no broken url', async () => {
    const result = await findlinks({ src: app.url, logger: console });
    if (result.fail !== 0) console.log(result);
    assert(result.fail === 0);
  });
});
