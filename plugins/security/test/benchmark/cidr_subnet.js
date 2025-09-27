'use strict';

const ip = require('@eggjs/ip');
const Benchmark = require('benchmark');
const benchmarks = require('beautify-benchmark');
const suite = new Benchmark.Suite();

const parsed1 = ip.cidrSubnet('10.0.0.0/8');
const parsed2 = ip.cidrSubnet('0.0.0.0/32');

console.log('10.0.0.0/8 contains 10.255.168.1', parsed1.contains('10.255.168.1'));
console.log('10.0.0.0/8 contains 11.255.168.1', parsed1.contains('11.255.168.1'));
console.log('0.0.0.0/32 contains 0.0.0.0', parsed2.contains('0.0.0.0'));
console.log('0.0.0.0/32 contains 0.0.0.1', parsed2.contains('0.0.0.1'));

suite

  .add('10.0.0/8 match', () => {
    parsed1.contains('10.255.168.1');
  })
  .add('10.0.0/8 not match', () => {
    parsed1.contains('11.255.168.1');
  })
  .add('0.0.0/32 match', () => {
    parsed1.contains('0.0.0.0');
  })
  .add('0.0.0/32 not match', () => {
    parsed1.contains('0.0.0.1');
  })
  .on('cycle', event => {
    benchmarks.add(event.target);
  })
  .on('start', () => {
    console.log(
      '\n  ip.cidrsubnet().contains() Benchmark\n  node version: %s, date: %s\n  Starting...',
      process.version,
      Date()
    );
  })
  .on('complete', () => {
    benchmarks.log();
  })
  .run({ async: false });

// ip.cidrsubnet().contains() Benchmark
// node version: v8.9.1, date: Tue Mar 27 2018 12:04:41 GMT+0800 (CST)
// Starting...
// 4 tests completed.

// 10.0.0/8 match     x 338,567 ops/sec ±2.98% (84 runs sampled)
// 10.0.0/8 not match x 315,822 ops/sec ±5.29% (81 runs sampled)
// 0.0.0/32 match     x 366,250 ops/sec ±4.47% (78 runs sampled)
// 0.0.0/32 not match x 370,959 ops/sec ±4.23% (82 runs sampled)
