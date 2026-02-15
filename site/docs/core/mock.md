---
title: Mock Helpers ( @eggjs/mock / mm )
---

Egg provides a dedicated mocking helper package for application unit tests: **`@eggjs/mock`** (historically known as **egg-mock**).

- Repository (Egg 3.x): https://github.com/eggjs/mock/tree/4.x
- API reference: see README in the repo.

`@eggjs/mock` is built on top of **`mm`** (Mock Mate), which provides low-level monkey-patching utilities.

- Repository: https://github.com/node-modules/mm

## Install

```bash
npm i @eggjs/mock --save-dev
```

> In many docs / legacy code you may still see `egg-mock`. For Egg 3.x, the recommended package name is `@eggjs/mock`.

## Quick Start

### Create an app instance

```js
const mock = require('@eggjs/mock');

describe('test/controller/home.test.js', () => {
  let app;

  before(async () => {
    app = mock.app({ baseDir: 'path/to/your/app' });
    await app.ready();
  });

  after(() => app.close());
});
```

### Use bootstrap to avoid repeated setup

```js
const { app, mock, assert } = require('egg-mock/bootstrap');

describe('test/controller/home.test.js', () => {
  // test cases
});
```

> The bootstrap helper wires common setup/teardown and is convenient for most projects.

### Create a Context

```js
it('should get a ctx', () => {
  const ctx = app.mockContext();
  assert(ctx.method === 'GET');
});

it('should mock ctx.user', () => {
  const ctx = app.mockContext({
    user: { name: 'fengmk2' },
  });
  assert(ctx.user.name === 'fengmk2');
});
```

## Restore after each test

When using `mm` / `@eggjs/mock`, remember to restore mocked state:

```js
const mm = require('mm');

afterEach(() => mm.restore());
```

If you use `egg-mock/bootstrap`, it already restores mocks for you in `afterEach`.

## mm (Mock Mate) API

`mm` is a general purpose monkey-patching library. `@eggjs/mock` is built on top of it, and many Egg tests use `mm` directly.

### Prefer using `@eggjs/mock` exports

For consistency inside the Egg ecosystem, prefer the `mm` that is exported by `@eggjs/mock` (egg-mock). It is compatible with `mm` and adds Egg-specific helpers.

```js
// CJS
const { app, mm } = require('egg-mock/bootstrap');
// mm.restore() in afterEach is already wired by bootstrap

// or
const mock = require('@eggjs/mock');
mock(mmTarget, 'prop', value);
mock.restore();
```

You can still use the standalone `mm` package directly if needed:

```js
import mm, { restore } from 'mm';
```

### Core

- `mm(target, property, value)` / `mm.mock(...)`: monkey-patch a property.
- `mm.restore()` / `restore()`: restore all patched properties.
- `mm.isMocked(target, property)`: check if a property is mocked.
- `mm.spy(target, method)`: spy a function (records call counts/args).

> When a mocked property is a function, mm will attach spy fields like `called`, `calledArguments`, `lastCalledArguments`.

### Callback-style helpers

- `mm.data(target, method, data[, timeout])`: callback returns `(null, data)`.
- `mm.datas(target, method, datas[, timeout])`: callback returns `(null, ...datas)`.
- `mm.empty(target, method[, timeout])`: callback returns `(null, null)`.
- `mm.error(target, method, error[, props|timeout][, timeout])`: callback returns an error.
- `mm.errorOnce(...)`: like `error` but only once.

### Sync helpers

- `mm.syncData(target, method, value)`: return value.
- `mm.syncEmpty(target, method)`: return `undefined`.
- `mm.syncError(target, method, error[, props])`: throw error.

### HTTP helpers

- `mm.http.request(url, data[, headers][, delay])`: mock `http.request` / `http.get`.
- `mm.http.requestError(url[, reqError][, resError][, delay])`: mock request/response errors.
- `mm.https.request(...)` / `mm.https.requestError(...)`: same for https.

### Other

- `mm.spawn(code, stdout, stderr[, timeout])`: mock `child_process.spawn`.
- `mm.classMethod(instance, method, mockFn)`: mock a class method via prototype.

For complete and up-to-date details, see the mm repository:
https://github.com/node-modules/mm
