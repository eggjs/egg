const Benchmark = require('benchmark');
const benchmarks = require('beautify-benchmark');
const Cookies = require('cookies');
const Keygrip = require('keygrip');
const { Cookies: EggCookies } = require('..');

const suite = new Benchmark.Suite();

const keys = ['this is a very very loooooooooooooooooooooooooooooooooooooong key'];
const keygrip = new Keygrip(keys);

const eggCookie = createEggCookie();
const cookie = createCookie();

console.log('------------get test----------');
console.log(eggCookie.get('eggSign', { signed: true }));
console.log(eggCookie.get('eggSign'));
console.log(eggCookie.get('eggEncrypt', { encrypt: true }));
console.log(cookie.get('sign', { signed: true }));
console.log(cookie.get('sign'));

console.log('------------set test----------');
eggCookie.set('eggSign', 'egg signed cookie', { signed: true });
cookie.set('sign', 'signed cookie', { signed: true });
eggCookie.set('eggEncrypt', 'egg encrypt cookie', { encrypt: true });
console.log(eggCookie.ctx.response.headers);
console.log(cookie.response.headers);

console.log('------------benchmark start----------');

suite
  .add('create EggCookie', function () {
    createEggCookie();
  })
  .add('create Cookie', function () {
    createCookie();
  })
  .add('EggCookies.set with signed', function () {
    createEggCookie().set('foo', 'bar', { signed: true });
  })
  .add('Cookies.set with signed', function () {
    createCookie().set('foo', 'bar', { signed: true });
  })
  .add('EggCookies.set without signed', function () {
    createEggCookie().set('foo', 'bar', { signed: false });
  })
  .add('Cookies.set without signed', function () {
    createCookie().set('foo', 'bar', { signed: false });
  })
  .add('EggCookies.set with encrypt', function () {
    createEggCookie().set('foo', 'bar', { encrypt: true });
  })
  .add('EggCookies.get with signed', function () {
    createEggCookie().get('eggSign', { signed: true });
  })
  .add('Cookies.get with signed', function () {
    createCookie().get('sign', { signed: true });
  })
  .add('EggCookies.get without signed', function () {
    createEggCookie().get('eggSign', { signed: false });
  })
  .add('Cookies.get without signed', function () {
    createCookie().get('sign', { signed: false });
  })
  .add('EggCookies.get with encrypt', function () {
    createEggCookie().get('eggEncrypt', { encrypt: true });
  })
  .on('cycle', event => benchmarks.add(event.target))
  .on('start', () => console.log('\n  node version: %s, date: %s\n  Starting...', process.version, Date()))
  .on('complete', () => {
    benchmarks.log();
    process.exit(0);
  })
  .run({ async: false });

function createCtx(egg) {
  const request = {
    headers: {
      cookie:
        'eggSign=egg signed cookie; eggSign.sig=SQ4wyGWr8vhSg7XCiz_MSxpHQ2GImbxE24fg4JVz7-o; sign=signed cookie; sign.sig=PvhhL9qTxML8uYSOaG_4Fr6EIEE; eggEncrypt=EpfmKzY4tX5OhafZS-onWOEIL0-CR6N_uGkFUFDCUno=;',
    },
    get(key) {
      return this.headers[key.toLowerCase()];
    },
    getHeader(key) {
      return this.get(key);
    },
    protocol: 'https',
    secure: true,
  };
  const response = {
    headers: {},
    get(key) {
      return this.headers[key.toLowerCase()];
    },
    getHeader(key) {
      return this.get(key);
    },
  };
  function set(key, value) {
    this.headers[key.toLowerCase()] = value;
  }
  if (egg) response.set = set;
  else response.setHeader = set;

  return {
    request,
    response,
    res: response,
    req: request,
    set(key, value) {
      this.response.set(key, value);
    },
    get(key) {
      return this.request.get(key);
    },
  };
}

function createEggCookie() {
  return new EggCookies(createCtx(true), keys);
}

function createCookie() {
  const ctx = createCtx();
  return new Cookies(ctx.req, ctx.res, { keys: keygrip });
}

// v3
// node version: v22.3.0, date: Sun Jun 23 2024 17:19:38 GMT+0800 (中国标准时间)
// Starting...
// 12 tests completed.

// create EggCookie              x 26,305,561 ops/sec ±3.41% (87 runs sampled)
// create Cookie                 x 18,373,466 ops/sec ±8.96% (81 runs sampled)
// EggCookies.set with signed    x    453,511 ops/sec ±1.37% (97 runs sampled)
// Cookies.set with signed       x    442,143 ops/sec ±2.48% (92 runs sampled)
// EggCookies.set without signed x  4,644,441 ops/sec ±2.05% (95 runs sampled)
// Cookies.set without signed    x  4,055,903 ops/sec ±0.14% (98 runs sampled)
// EggCookies.set with encrypt   x    477,018 ops/sec ±1.10% (97 runs sampled)
// EggCookies.get with signed    x    367,708 ops/sec ±0.29% (92 runs sampled)
// Cookies.get with signed       x    133,608 ops/sec ±4.24% (87 runs sampled)
// EggCookies.get without signed x  9,233,880 ops/sec ±8.40% (86 runs sampled)
// Cookies.get without signed    x  7,135,602 ops/sec ±4.52% (86 runs sampled)
// EggCookies.get with encrypt   x    423,227 ops/sec ±2.52% (89 runs sampled)

// v2
// create EggCookie              x 6,892,450 ops/sec ±1.19% (85 runs sampled)
// create Cookie                 x 3,885,528 ops/sec ±1.07% (84 runs sampled)
// EggCookies.set with signed    x    87,470 ops/sec ±1.63% (84 runs sampled)
// Cookies.set with signed       x    85,711 ops/sec ±1.26% (85 runs sampled)
// EggCookies.set without signed x   557,636 ops/sec ±0.97% (86 runs sampled)
// Cookies.set without signed    x   550,085 ops/sec ±1.16% (86 runs sampled)
// EggCookies.set with encrypt   x    68,705 ops/sec ±1.78% (80 runs sampled)
// EggCookies.get with signed    x    78,196 ops/sec ±1.70% (83 runs sampled)
// Cookies.get with signed       x    93,181 ops/sec ±1.58% (81 runs sampled)
// EggCookies.get without signed x 1,942,366 ops/sec ±1.14% (84 runs sampled)
// Cookies.get without signed    x 1,707,255 ops/sec ±1.13% (86 runs sampled)
// EggCookies.get with encrypt   x    71,063 ops/sec ±2.53% (81 runs sampled)
