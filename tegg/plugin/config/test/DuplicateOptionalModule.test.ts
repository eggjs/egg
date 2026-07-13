import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, afterAll, beforeAll, expect } from 'vitest';

import { getFixtures } from './utils.ts';

describe('plugin/config/test/DuplicateOptionalModule.test.ts', () => {
  let app: MockApplication;
  afterAll(async () => {
    await app.close();
  });

  beforeAll(async () => {
    app = mm.app({
      baseDir: getFixtures('apps/duplicate-optional-module'),
    });
    await app.ready();
  });

  it('should work', async () => {
    expect(app.moduleReferences.map((reference) => reference.name)).toEqual([
      'used',
      'teggConfig',
      'teggAjv',
      'teggAop',
      'teggController',
      'teggDal',
      'unused',
    ]);
    expect(Object.keys(app.moduleConfigs)).toEqual([
      'used',
      'teggConfig',
      'teggAjv',
      'teggAop',
      'teggController',
      'teggDal',
      'unused',
    ]);
  });
});
