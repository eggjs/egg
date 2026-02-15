---
title: 测试 Mock 工具（@eggjs/mock / mm）
---

Egg 为应用单元测试抽取了专门的 Mock 辅助包：**`@eggjs/mock`**（历史上也常被称为 **egg-mock**）。

- 仓库（Egg 3.x）：https://github.com/eggjs/mock/tree/4.x
- API 说明：请以仓库 README 为准。

`@eggjs/mock` 底层基于 **`mm`**（Mock Mate），提供更通用的打桩/猴子补丁能力。

- mm 仓库：https://github.com/node-modules/mm

## 安装

```bash
npm i @eggjs/mock --save-dev
```

> 你可能会在旧文档/历史代码中看到 `egg-mock`。对 Egg 3.x，推荐直接使用 `@eggjs/mock`。

## 快速开始

### 创建 app 实例

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

### 使用 bootstrap 避免重复初始化

```js
const { app, mock, assert } = require('egg-mock/bootstrap');

describe('test/controller/home.test.js', () => {
  // 测试用例
});
```

> bootstrap 会帮你做常用的初始化/清理流程，大多数项目直接用它即可。

### 创建 Context

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

## 每个用例后恢复 mock

在使用 `mm` / `@eggjs/mock` 时，需要记得恢复被 mock 的状态，避免污染其它用例：

```js
const mm = require('mm');

afterEach(() => mm.restore());
```

如果你使用了 `egg-mock/bootstrap`，它会在 `afterEach` 中自动帮你 restore。

## mm（Mock Mate）API

`mm` 是通用的 monkey-patch 工具库，`@eggjs/mock` 底层基于它实现，很多 Egg 的测试也会直接使用 `mm`。

### 推荐使用 `@eggjs/mock` 的导出

为了保持 Egg 生态的一体性，建议优先使用 `@eggjs/mock`（egg-mock）导出的 `mm`：它与 `mm` 兼容，同时还包含 Egg 相关的 mock 能力。

```js
// CJS
const { app, mm } = require('egg-mock/bootstrap');
// bootstrap 已经在 afterEach 中自动执行了 mm.restore()

// 或者
const mock = require('@eggjs/mock');
mock(target, 'prop', value);
mock.restore();
```

如果确实需要，也可以直接使用独立的 `mm` 包：

```js
import mm, { restore } from 'mm';
```

### 核心能力

- `mm(target, property, value)` / `mm.mock(...)`：mock/打桩某个属性。
- `mm.restore()` / `restore()`：还原所有被 mock 的属性。
- `mm.isMocked(target, property)`：判断某个属性是否已被 mock。
- `mm.spy(target, method)`：只做 spy（记录调用次数/参数）。

> 当 mock 的属性是函数时，会自动附带 spy 字段：`called`、`calledArguments`、`lastCalledArguments`。

### 回调风格（Node callback）辅助

- `mm.data(target, method, data[, timeout])`：回调返回 `(null, data)`。
- `mm.datas(target, method, datas[, timeout])`：回调返回 `(null, ...datas)`。
- `mm.empty(target, method[, timeout])`：回调返回 `(null, null)`。
- `mm.error(target, method, error[, props|timeout][, timeout])`：回调返回 error。
- `mm.errorOnce(...)`：类似 `error`，但只生效一次。

### 同步函数辅助

- `mm.syncData(target, method, value)`：直接 return。
- `mm.syncEmpty(target, method)`：return `undefined`。
- `mm.syncError(target, method, error[, props])`：直接 throw。

### HTTP mock

- `mm.http.request(url, data[, headers][, delay])`：mock `http.request` / `http.get`。
- `mm.http.requestError(url[, reqError][, resError][, delay])`：mock request/response error。
- `mm.https.request(...)` / `mm.https.requestError(...)`：同理（https）。

### 其它

- `mm.spawn(code, stdout, stderr[, timeout])`：mock `child_process.spawn`。
- `mm.classMethod(instance, method, mockFn)`：通过 prototype mock class method。

完整、最新的 API 仍建议以 mm 仓库为准：
https://github.com/node-modules/mm
