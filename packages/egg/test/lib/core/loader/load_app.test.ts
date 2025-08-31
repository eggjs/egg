import { strict as assert } from 'node:assert';
import { MockApplication, createApp } from '../../../utils.js';

describe('test/lib/core/loader/load_app.test.ts', () => {
  let app: MockApplication;
  before(() => {
    app = createApp('apps/loader-plugin');
    return app.ready();
  });
  after(() => app.close());

  it('should load app.js', () => {
    assert(app.b === 'plugin b');
    assert(app.c === 'plugin c');
    assert(app.app === 'app');
  });

  it('should load plugin app.js first', () => {
    assert(app.dateB <= app.date === true);
    assert(app.dateC <= app.date === true);
  });

  it('should not load disable plugin', () => {
    assert(!app.a);
  });
});
