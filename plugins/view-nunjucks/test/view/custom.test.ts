import path from 'node:path';

import { describe, it, beforeAll, afterAll, afterEach, expect } from 'vitest';
import { mock, type MockApplication } from '@eggjs/mock';

function getFixtures(name: string): string {
  return path.join(import.meta.dirname, '../fixtures', name);
}

describe('test/view/custom.test.ts', () => {
  let app: MockApplication;

  beforeAll(async () => {
    app = mock.app({
      baseDir: getFixtures('custom-tag'),
      framework: getFixtures('framework'),
    });
    await app.ready();
  });

  afterAll(() => app.close());
  afterEach(() => mock.restore());

  it('should render markdown with custom tag', async () => {
    const res = await app.httpRequest().get('/markdown');
    expect(res.text).toBe('<h2>hi egg</h2>\n');
    expect(res.status).toBe(200);
  });
});
