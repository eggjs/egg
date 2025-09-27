import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, expect, afterAll, beforeAll } from 'vitest';

import { getFixtures } from './utils.ts';

describe('context.isSafeDomain', () => {
  let app: MockApplication;
  beforeAll(async () => {
    app = mm.app({
      baseDir: getFixtures('apps/isSafeDomain-custom'),
    });
    await app.ready();
  });

  afterAll(() => app.close());

  it('should return false when domains are not safe', async () => {
    expect(app.config.security).toMatchSnapshot();
    const res = await app.httpRequest().get('/unsafe').set('accept', 'text/html').expect(200);
    expect(res.text).toBe('false');
  });

  it('should return true when domains are safe', async () => {
    const res = await app.httpRequest().get('/safe').set('accept', 'text/html').expect(200);
    expect(res.text).toBe('true');
  });
});
