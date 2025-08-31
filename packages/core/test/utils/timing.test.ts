import assert from 'node:assert/strict';

import { Timing } from '../../src/utils/timing.js';

describe('test/utils/timing.test.ts', () => {
  it('should trace', () => {
    const timing = new Timing();
    timing.start('a');
    timing.end('a');
    timing.start('b');
    timing.end('b');

    const json = timing.toJSON();
    assert.equal(json.length, 3);

    assert.equal(json[1].name, 'a');
    assert(json[1].start);
    assert(json[1].end);
    assert.equal(json[1].end - json[1].start, json[1].duration);
    assert.equal(json[1].pid, process.pid);
    assert.equal(json[2].name, 'b');
    assert(json[2].start);
    assert(json[2].end);
    assert.equal(json[2].end - json[2].start, json[2].duration);
    assert.equal(json[2].pid, process.pid);

    timing.start('c');
    console.log(timing.toString());
  });

  it('should set item when start', () => {
    const timing = new Timing();
    timing.start('a');

    const json = timing.toJSON();
    assert.equal(json[1].name, 'a');
    assert(json[1].start);
    assert.equal(json[1].end, undefined);
    assert.equal(json[1].duration, undefined);
  });

  it('should ignore start when name is empty', () => {
    const timing = new Timing();
    timing.start();

    const json = timing.toJSON();
    assert.equal(json.length, 1);
  });

  it('should throw when name exists', () => {
    const timing = new Timing();
    timing.start('a');
    assert.equal(timing.toJSON().length, 2);

    timing.start('a');
    assert.equal(timing.toJSON().length, 3);
  });

  it("should ignore end when name don't exist", () => {
    const timing = new Timing();
    timing.end();
    assert.equal(timing.toJSON().length, 1);
  });

  it('should enable/disable', () => {
    const timing = new Timing();
    timing.start('a');
    timing.end('a');

    timing.disable();

    timing.start('b');
    timing.end('b');

    timing.enable();

    timing.start('c');
    timing.end('c');

    const json = timing.toJSON();

    assert.equal(json[1].name, 'a');
    assert.equal(json[2].name, 'c');
    assert.equal(json.length, 3);
  });

  it('should clear', () => {
    const timing = new Timing();
    timing.start('a');
    timing.end('a');

    const json = timing.toJSON();
    assert.equal(json[1].name, 'a');

    timing.clear();

    timing.start('b');
    timing.end('b');

    const json2 = timing.toJSON();

    assert.equal(json2[0].name, 'b');
    assert.equal(json2.length, 1);
  });

  it("should throw when end and name don't exists", () => {
    const timing = new Timing();
    assert.throws(() => {
      timing.end('a');
    }, /should run timing.start\('a'\) first/);
  });

  it('should init process start time', () => {
    const timing = new Timing();
    const processStart = timing
      .toJSON()
      .find(item => item.name === 'Process Start');
    assert(processStart);
    assert(processStart.start);
    assert(processStart.end);
  });
});
