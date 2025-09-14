import { strict as assert } from 'node:assert';

import { beforeAll, afterAll, it, describe } from 'vitest';
import { mm, type MockApplication } from '@eggjs/mock';

import { getFilepath } from './utils.ts';

describe('test/timing.test.ts', () => {
  let app: MockApplication;
  beforeAll(async () => {
    mm.env('local');
    app = mm.app({
      baseDir: getFilepath('timing'),
    });
    await app.ready();
  });
  afterAll(() => app.close());

  it('should render page', async () => {
    const res = await app.httpRequest().get('/__loader_trace__').expect(200);

    const jsonString = res.text.match(/data = (.*?);/);
    assert(jsonString);
    assert(jsonString[1].length > 3000);
    const json = JSON.parse(jsonString[1]);

    const first = json[0];
    assert(first);
    assert.equal(first.type, 'agent');
    assert.equal(typeof first.pid, 'string');
    assert.deepEqual(first.range, [first.start, first.end]);
    assert.equal(first.title, 'agent(0)');

    const last = json[json.length - 1];
    // console.log(last);
    assert.match(last.type, /^app_\d+$/);
    assert.equal(typeof last.pid, 'string');
    assert.deepEqual(last.range, [last.start, last.end]);
    assert.match(last.title, /^app_\d+\(\d+\)$/);
  });
});
