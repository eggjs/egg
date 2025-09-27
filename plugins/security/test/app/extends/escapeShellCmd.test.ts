import { mm, type MockApplication } from '@eggjs/mock';
import { beforeAll, afterAll, describe, it } from 'vitest';

import { getFixtures } from '../../utils.ts';

describe('test/app/extends/escapeShellCmd.test.ts', () => {
  let app: MockApplication;
  beforeAll(async () => {
    app = mm.app({
      baseDir: getFixtures('apps/helper-escapeShellCmd-app'),
    });
    await app.ready();
  });

  afterAll(() => app.close());

  describe('helper.escapeShellCmd()', () => {
    it('should convert chars in blacklists', () => {
      return app.httpRequest().get('/escapeShellCmd').expect(200).expect('true');
    });

    it('should not affect normal cmd', () => {
      return app.httpRequest().get('/escapeShellCmd-2').expect(200).expect('true');
    });
  });
});
