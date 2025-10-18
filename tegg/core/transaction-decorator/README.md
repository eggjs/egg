# @eggjs/tegg-transaction-decorator

[![NPM version][npm-image]][npm-url]
[![Known Vulnerabilities][snyk-image]][snyk-url]
[![npm download][download-image]][download-url]
[![Node.js Version](https://img.shields.io/node/v/@eggjs/tegg-transaction-decorator.svg?style=flat)](https://nodejs.org/en/download/)

[npm-image]: https://img.shields.io/npm/v/@eggjs/tegg-transaction-decorator.svg?style=flat-square
[npm-url]: https://npmjs.org/package/@eggjs/tegg-transaction-decorator
[snyk-image]: https://snyk.io/test/npm/@eggjs/tegg-transaction-decorator/badge.svg?style=flat-square
[snyk-url]: https://snyk.io/test/npm/@eggjs/tegg-transaction-decorator
[download-image]: https://img.shields.io/npm/dm/@eggjs/tegg-transaction-decorator.svg?style=flat-square
[download-url]: https://npmjs.org/package/@eggjs/tegg-transaction-decorator

事务注解

## Usage

### 传播机制

```ts
export class Foo {
  @Transactional({ propagation: PropagationType.ALWAYS_NEW })
  async bar() {
    await this.foo();
  }

  @Transactional({ propagation: PropagationType.REQUIRED })
  async foo(msg) {
    console.log('has msg: ', msg);
  }
}
```

### 数据源

```ts
export class Bar {
  @Transactional({ dataSourceName: 'xx' })
  async bar() {
    await this.foo();
  }
}
```

Foo.bar 始终会在一个独立的事务中执行，而 Foo.foo 会在 Foo.bar 的事务中执行
