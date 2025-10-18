import path from 'node:path';
import { describe, it, beforeAll, afterAll, afterEach } from 'vitest';
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

  it('should render markdown with custom tag', () => {
    return app.httpRequest().get('/markdown').expect(200).expect('<h2 id="hi-egg">hi egg</h2>\n');
  });
});
