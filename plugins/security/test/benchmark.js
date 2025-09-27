'use strict';

const Benchmark = require('benchmark');
const benchmarks = require('beautify-benchmark');
const sjsHelper = require('../lib/helper/sjs');
const shtmlHelper = require('../lib/helper/shtml');
const surlHelper = require('../lib/helper/surl');
const spathHelper = require('../lib/helper/spath');
const sjsonHelper = require('../lib/helper/sjson');
const mm = require('egg-mock');
const app = mm.app({
  baseDir: 'apps/helper-app',
  plugin: 'security',
});
const ctx = app.mockContext();
ctx.ctx = {};
ctx.ctx.coreLogger = {
  warn() {},
};
const suite = new Benchmark.Suite();
const tc1 = '"hello"123abc"';
let tc2 = '';

for (let i = 0, l = 128; i < l; i++) {
  if (i === 9 || i === 10 || i === 13 || (i > 47 && i < 58) || (i > 64 && i < 91) || (i > 96 && i < 123)) {
    continue;
  } else {
    tc2 += String.fromCharCode(i);
  }
}

const tc3 = '<img src="https://domain.com"><h1>xx</h1>';
const tc4 = '<html><h1>Hello</h1></html>';
const tc5 = '<html><h1>Hello</h1></html>';
const tc6 = '<h1>Hello</h1><script>alert(1)</script>';
const tc7 = '<h1>Hello</h1><img onload="alert(1);" src="http://taobao.com/1.png" title="this is image">';
const tc8 = '<img src="http://shaoshuai.me" alt="alt"><a href="http://shaoshuai.me">xx</a>';
const tc9 = '<img src="/xx.png" alt="alt"><a href="/xx.png">xx</a>';
const tc10 = '/////foo.com/';
const tc11 = 'xxx://xss.com';
const tc12 = '2.jpg';
const tc13 = '../home/admin';

const tc14 = {
  a: 1,
};
const tc15 = {
  a: '<script type="sdfdsd">alert(111)</script>',
};
const tc16 = {
  a: {
    b: {
      c: {
        d: '<script>?</script>',
      },
    },
  },
};
const tc17 = {
  a: {
    b: {
      c: {
        '<script>': [
          '<script>?</script>',
          {
            e: '<script>',
          },
        ],
      },
    },
  },
};
suite

  .add('Sjs helper benchmark: simple code convert benchmark', function () {
    // 466,569 ops/sec ±1.15% (97 runs sampled)
    sjsHelper.call(ctx, tc1);
  })
  .add('Sjs helper benchmark: whole code convert benchmark', function () {
    // 55,800 ops/sec ±1.47% (97 runs sampled)
    sjsHelper.call(ctx, tc2);
  })
  .add('Shtml helper benchmark: basic benchmark', function () {
    // 43,415 ops/sec ±1.28% (95 runs sampled)
    shtmlHelper.call(ctx, tc3);
  })
  .add('Shtml helper benchmark: shtml-escape-tag-not-in-default-whitelist benchmark', function () {
    // 146,729 ops/sec ±1.03% (96 runs sampled)
    shtmlHelper.call(ctx, tc4);
  })
  .add('Shtml helper benchmark: multiple-filter benchmark', function () {
    // 145,911 ops/sec ±1.10% (96 runs sampled)
    shtmlHelper.call(ctx, tc5);
  })
  .add('Shtml helper benchmark: escape-script benchmark', function () {
    // 145,777 ops/sec ±0.80% (94 runs sampled)
    shtmlHelper.call(ctx, tc6);
  })
  .add('Shtml helper benchmark: escape-img-onload benchmark', function () {
    // 34,096 ops/sec ±0.82% (98 runs sampled)
    shtmlHelper.call(ctx, tc7);
  })
  .add('Shtml helper benchmark: ignore-domains-not-in-default-domainList benchmark', function () {
    // 21,823 ops/sec ±1.12% (98 runs sampled)
    shtmlHelper.call(ctx, tc8);
  })
  .add('Shtml helper benchmark: absolute-path benchmark', function () {
    // 64,219 ops/sec ±0.70% (98 runs sampled)
    shtmlHelper.call(ctx, tc9);
  })
  .add('Surl helper benchmark: protocol white list benchmark', function () {
    // 5,452,217 ops/sec ±0.71% (97 runs sampled)
    surlHelper.call(ctx, tc10);
  })
  .add('Surl helper benchmark: protocol not in white list benchmark', function () {
    // 323,139 ops/sec ±0.71% (98 runs sampled)
    surlHelper.call(ctx, tc11);
  })
  .add('Spath helper benchmark: simple file path benchmark', function () {
    // 6,850,718 ops/sec ±0.78% (98 runs sampled)
    spathHelper.call(ctx, tc12);
  })
  .add('Spath helper benchmark: unsecurity file path benchmark', function () {
    // 7,480,158 ops/sec ±0.54% (101 runs sampled)
    spathHelper.call(ctx, tc13);
  })
  .add('Sjson helper benchmark: simple json benchmark', function () {
    // 631,374 ops/sec ±2.09% (91 runs sampled)
    sjsonHelper.call(ctx, tc14);
  })
  .add('Sjson helper benchmark: unsecurity json benchmark', function () {
    // 94,462 ops/sec ±2.84% (95 runs sampled)
    sjsonHelper.call(ctx, tc15);
  })
  .add('Sjson helper benchmark: unsecurity nested json benchmark', function () {
    // 72,742 ops/sec ±1.08% (95 runs sampled)
    sjsonHelper.call(ctx, tc16);
  })
  .add('Sjson helper benchmark: unsecurity array nested json benchmark', function () {
    // 41,798 ops/sec ±1.72% (96 runs sampled)
    sjsonHelper.call(ctx, tc17);
  })
  .on('cycle', function (event) {
    benchmarks.add(event.target);
  })
  .on('start', function () {
    console.log('\n helper Benchmark\n  node version: %s, date: %s\n  Starting...', process.version, Date());
  })
  .on('complete', function done() {
    benchmarks.log();
  })
  .run({
    async: false,
  });
