import path from 'node:path';

import { describe, it, beforeAll, afterAll, afterEach, expect } from 'vitest';
import { mock, type MockApplication } from '@eggjs/mock';
import { stripIndent } from 'common-tags';

function getFixtures(name: string): string {
  return path.join(import.meta.dirname, '../fixtures', name);
}

describe('test/view/helper.test.ts', () => {
  let app: MockApplication;

  beforeAll(async () => {
    app = mock.app({
      baseDir: getFixtures('view-helper'),
      framework: getFixtures('framework'),
    });
    await app.ready();
  });

  afterAll(() => app.close());
  afterEach(() => mock.restore());

  it('should use view helper', () => {
    return app
      .httpRequest()
      .get('/helper')
      .expect(200)
      .expect(
        new RegExp(
          stripIndent`
        value: bar
        value: undefined
        value: bar
        value: bar
        /nunjucks_filters
      `
        )
      );
  });

  it('should use override escape', async () => {
    const res = await app.httpRequest().get('/escape');
    expect(res.text).toBe(stripIndent`
        <safe>
        &lt;escape2&gt;
        <helper-safe>
        &lt;helper&gt;
        &lt;helper-escape&gt;
        &lt;helper-escape&gt;
        &lt;helper2&gt;
      `);
    expect(res.status).toBe(200);
  });

  describe('fill nunjucks filter to helper', () => {
    it('should merge nunjucks filter to view helper', () => {
      return app.httpRequest().get('/nunjucks_filters').expect(200).expect(/EGG/);
    });

    it('should work .safe', () => {
      return app
        .httpRequest()
        .get('/helper')
        .expect(200)
        .expect(/safe: <div>foo<\/div>\n/);
    });

    it('should work .escape', () => {
      return app
        .httpRequest()
        .get('/helper')
        .expect(200)
        .expect(/escape: &lt;div&gt;foo&lt;\/div&gt;\n/);
    });

    it('should work safe & escape', () => {
      return app
        .httpRequest()
        .get('/helper')
        .expect(200)
        .expect(/safe-escape: <div>&lt;span&gt;<\/div>\n/);
    });

    it('should work .csrfTag', () => {
      return app
        .httpRequest()
        .get('/helper')
        .expect(200)
        .expect(/csrfTag: <input type="hidden" name="_csrf" value=".*?" \/>\n/);
    });
  });
});
