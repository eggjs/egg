import { strict as assert } from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';

import { mm, type MockApplication } from '@eggjs/mock';
import { beforeAll, afterAll, it, describe } from 'vitest';

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

  it('should safely serialize trace data into inline script', async () => {
    const payload = "</script><script>alert(1)</script>$'$&";
    const fixturePath = path.join(app.config.rundir, 'agent_timing_safe_serialize.json');
    const start = Date.now();
    await fs.writeFile(
      fixturePath,
      JSON.stringify([
        {
          duration: 1,
          end: start + 1,
          index: 999,
          name: payload,
          pid: 12345,
          start,
        },
      ]),
    );

    try {
      const res = await app.httpRequest().get('/__loader_trace__').expect(200);

      assert(res.text.includes("\\u003C/script\\u003E\\u003Cscript\\u003Ealert(1)\\u003C/script\\u003E$'$\\u0026"));
      assert.doesNotMatch(res.text, /<\/script><script>alert\(1\)<\/script>/);
      const jsonString = res.text.match(/data = (.*?);/);
      assert(jsonString);
      const json: Array<{ name: string }> = JSON.parse(jsonString[1]);
      assert(json.some((item) => item.name === payload));
    } finally {
      await fs.rm(fixturePath, { force: true });
    }
  });
});
