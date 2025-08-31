import { strict as assert } from 'node:assert';
import { createApp } from '../../helper.js';

describe('test/loader/mixin/load_application_extend.test.ts', () => {
  let app: any;
  before(async () => {
    app = createApp('application');
    await app.loader.loadPlugin();
    await app.loader.loadConfig();
    await app.loader.loadApplicationExtend();
  });
  after(() => app.close());

  it('should load extend from chair, plugin and application', () => {
    assert(app.poweredBy);
    assert(app.a);
    assert(app.b);
    assert(app.foo);
    assert(app.bar);
  });

  it('should override chair by plugin', () => {
    assert(app.a === 'plugin a');
    assert(app.b === 'plugin b');
    assert(app.poweredBy === 'plugin a');
  });

  it('should override plugin by app', () => {
    assert(app.foo === 'app bar');
    assert(app.bar === 'foo');
  });
});
