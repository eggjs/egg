'use strict';

const Benchmark = require('benchmark');
const benchmarks = require('beautify-benchmark');
const suite = new Benchmark.Suite();

class Response {
  constructor() {
    this.headers = {};
    this.headerNames = {};
  }

  set(name, value) {
    // https://github.com/nodejs/node/blob/master/lib/_http_outgoing.js#L363
    const key = name.toLowerCase();
    this.headers[key] = value;
    this.headerNames[key] = name;
  }

  setWithoutLowerCase(name, value) {
    const key = name;
    this.headers[key] = value;
    this.headerNames[key] = name;
  }
}

suite

  .add('set()', () => {
    const r = new Response();
    r.set('X-Frame-Options1', 'X-Frame-Options1 value');
    r.set('X-Frame-Options2', 'X-Frame-Options2 value');
    r.set('X-Frame-Options3', 'X-Frame-Options3 value');
  })

  .add('set() with lower case name', () => {
    const r = new Response();
    r.set('x-frame-options1', 'X-Frame-Options1 value');
    r.set('x-frame-options2', 'X-Frame-Options2 value');
    r.set('x-frame-options3', 'X-Frame-Options3 value');
  })

  .add('setWithoutLowerCase()', () => {
    const r = new Response();
    r.setWithoutLowerCase('X-Frame-Options1', 'X-Frame-Options1 value');
    r.setWithoutLowerCase('X-Frame-Options2', 'X-Frame-Options2 value');
    r.setWithoutLowerCase('X-Frame-Options3', 'X-Frame-Options3 value');
  })

  .add('setWithoutLowerCase() with lower case name', () => {
    const r = new Response();
    r.setWithoutLowerCase('x-frame-options1', 'X-Frame-Options1 value');
    r.setWithoutLowerCase('x-frame-options2', 'X-Frame-Options2 value');
    r.setWithoutLowerCase('x-frame-options3', 'X-Frame-Options3 value');
  })

  .on('cycle', event => {
    benchmarks.add(event.target);
  })
  .on('start', () => {
    console.log('\n  setHeader() Benchmark\n  node version: %s, date: %s\n  Starting...', process.version, Date());
  })
  .on('complete', () => {
    benchmarks.log();
  })
  .run({ async: false });

// setHeader() Benchmark
//   node version: v6.4.0, date: Tue Aug 30 2016 10:53:16 GMT+0800 (CST)
//   Starting...
//   4 tests completed.
//
//   set()                                      x    433,595 ops/sec ±5.37% (79 runs sampled)
//   set() with lower case name                 x  3,895,403 ops/sec ±1.61% (86 runs sampled)
//   setWithoutLowerCase()                      x 10,567,733 ops/sec ±1.69% (86 runs sampled)
//   setWithoutLowerCase() with lower case name x 10,217,612 ops/sec ±1.22% (87 runs sampled)
