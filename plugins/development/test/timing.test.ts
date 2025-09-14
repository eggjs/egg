import { strict as assert } from 'node:assert';
import { scheduler } from 'node:timers/promises';
import { mm, MockApplication } from '@eggjs/mock';

describe('test/timing.test.ts', () => {
  let app: MockApplication;
  before(async () => {
    mm.env('local');
    app = mm.cluster({
      baseDir: 'timing',
    });
    await app.ready();
  });
  after(() => app.close());

  it('should render page', async () => {
    await scheduler.wait(1000);

    const res = await app.httpRequest().get('/__loader_trace__');

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
