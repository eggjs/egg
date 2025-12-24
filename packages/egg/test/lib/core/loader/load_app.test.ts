import { describe, it, beforeAll, afterAll, expect } from '@voidzero-dev/vite-plus/test';

import { type MockApplication, createApp } from '../../../utils.ts';

describe('test/lib/core/loader/load_app.test.ts', () => {
  let app: MockApplication;
  beforeAll(() => {
    app = createApp('apps/loader-plugin');
    return app.ready();
  });
  afterAll(() => app.close());

  it('should load app.js', () => {
    expect(app.b).toBe('plugin b');
    expect(app.c).toBe('plugin c');
    expect(app.app).toBe('app');
  });

  it('should load plugin app.js first', () => {
    expect(app.dateB <= app.date).toBe(true);
    expect(app.dateC <= app.date).toBe(true);
  });

  it('should not load disable plugin', () => {
    expect(app.a).toBeUndefined();
  });
});
