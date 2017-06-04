'use strict';

const path = require('path');
const findlinks = require('findlinks');
const assert = require('assert');
const runscript = require('runscript');
const utils = require('./utils');

describe('test/doc.test.js', () => {

  let app;
  before(function* () {
    yield runscript('doctools build', { cwd: path.dirname(__dirname) });
  });
  before(function* () {
    app = utils.cluster({
      baseDir: 'apps/docapp',
    });
    app.coverage(false);
    yield app.ready();
  });
  after(() => app.close());

  it('should no broken url', function* () {
    console.log(app.url);
    const result = yield findlinks({ src: app.url, logger: console });
    assert(result.fail === 0);
  });
});
