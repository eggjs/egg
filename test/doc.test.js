'use strict';

const path = require('path');
const findlinks = require('findlinks');
const assert = require('assert');
const runscript = require('runscript');
const utils = require('./utils');
// const puppeteer = require('puppeteer');

describe.skip('test/doc.test.js', () => {
  /**
   * dumi's index page is rendered by react,
   * so we need puppeteer to complete tests which can only work with node.js >=10.18.1.
   * please install puppeteer and run tests.
   */

  let app;

  before(async () => {
    const cwd = path.dirname(__dirname);
    const dumi = path.join(cwd, 'node_modules', '.bin', 'dumi');
    await runscript(`APP_ROOT=docs ${dumi} build`, {
      cwd,
    });
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

    const result = await findlinks({ src: app.url, logger: console }); // const result = await findlinks({ src: app.url, logger: console, puppeteer });
    if (result.fail !== 0) console.log(result);
    assert(result.fail === 0);
  }).timeout(5 * 60 * 1000);
});
