import { mm, type MockApplication } from '@eggjs/mock';
import { beforeAll, afterAll, describe, it } from 'vitest';

import { getFixtures } from '../../utils.ts';

describe('test/app/extends/escapeShellArg.test.ts', () => {
  let app: MockApplication;
  beforeAll(async () => {
    app = mm.app({
      baseDir: getFixtures('apps/helper-escapeShellArg-app'),
    });
    await app.ready();
  });

  afterAll(() => app.close());

  describe('helper.escapeShellArg()', () => {
    it('should add single quotes around a string', () => {
      return app.httpRequest().get('/escapeShellArg').expect(200).expect('true');
    });

    it('should add single quotes around a string and quotes/escapes any existing single quotes', () => {
      return app.httpRequest().get('/escapeShellArg-2').expect(200).expect('true');
    });

    it('should not affect normal arg', () => {
      return app.httpRequest().get('/escapeShellArg-3').expect(200).expect('true');
    });
  });
});
