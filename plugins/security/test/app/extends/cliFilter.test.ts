import { mm, type MockApplication } from '@eggjs/mock';
import { beforeAll, afterAll, describe, it } from 'vitest';

import { getFixtures } from '../../utils.ts';

describe('test/app/extends/cliFilter.test.ts', () => {
  let app: MockApplication;
  beforeAll(async () => {
    app = mm.app({
      baseDir: getFixtures('apps/helper-cliFilter-app'),
    });
    await app.ready();
  });

  afterAll(() => app.close());

  describe('helper.cliFilter()', () => {
    it('should convert special chars in param and not convert chars in whitelists', () => {
      return app.httpRequest().get('/cliFilter').expect(200).expect('true');
    });

    it('should not convert when chars in whitelists', () => {
      return app.httpRequest().get('/cliFilter-2').expect(200).expect('true');
    });
  });
});
