---
name: egg-unittest
description: 本技能用于编写 EGG 应用的单元测试。覆盖 HTTP 接口测试、Service/DI 对象测试、Mock 数据模拟、BackgroundTask 和 EventBus 测试。使用 @eggjs/mock、app.httpRequest()、app.getEggObject()、mm() 等 API。
allowed-tools: Read
---

# EGG 单元测试

---

## 原理

`egg-bin test` 使用 Vitest 运行测试，自动完成以下工作：

- 以当前项目目录为 baseDir，创建并启动一个 MockApplication 实例（即 `app`）
- 注入 `@eggjs/mock/setup_vitest` 管理 app 生命周期（`beforeAll` 启动 app、`afterEach` 恢复 mock、`afterAll` 关闭 app）
- 注入 Vitest 全局变量（`describe`、`it`、`beforeAll` 等），无需手动 import
  测试代码中通过 `import { app, mm } from '@eggjs/mock/bootstrap'` 获取已启动的 app 实例和 mock 工具，直接使用即可。

---

## 配置检查

确保项目中有以下配置：

**package.json：**

```json
{
  "scripts": {
    "test": "egg-bin test"
  },
  "devDependencies": {
    "@eggjs/bin": "^8",
    "@eggjs/mock": "^8"
  }
}
```

**测试文件约定：**

- 测试目录：`test/`
- 文件命名：`*.test.ts`

**自定义 setup 文件（可选）：**

如果存在 `test/.setup.ts`，egg-bin 会自动将其加入 vitest setupFiles，在 `@eggjs/mock/setup_vitest` 之前执行（即 app 启动之前）。可用于设置环境变量等全局初始化：

```typescript
// test/.setup.ts
beforeAll(() => {
  process.env.SOME_CONFIG = 'test-value';
});
```

---

## 简单示例

### HTTP 接口测试

```typescript
import assert from 'node:assert';
import { app } from '@eggjs/mock/bootstrap';

describe('test/controller/home.test.ts', () => {
  it('should GET /', () => {
    return app.httpRequest().get('/').expect(200).expect('hello world');
  });
});
```

### Service 测试

```typescript
import assert from 'node:assert';
import { app } from '@eggjs/mock/bootstrap';
import { UserService } from '../app/modules/user/UserService.ts';

describe('test/service/user.test.ts', () => {
  it('should get user', async () => {
    const userService = await app.getEggObject(UserService);
    const user = await userService.getById('1');
    assert(user);
    assert.equal(user.name, 'test');
  });
});
```

---

## 测试场景决策树

```
要测什么？

1. HTTP 接口（GET/POST/PUT/DELETE）？
   → 参考 references/http-test.md

2. Service / DI 对象的方法？
   → 参考 references/service-test.md

3. 需要 mock 外部依赖？（HTTP 调用、Service 方法、Session、CSRF）
   → 参考 references/mock.md

4. BackgroundTaskHelper（后台异步任务）？
   → 参考 references/background-task-test.md

5. EventBus（事件驱动）？
   → 参考 references/eventbus-test.md
```

---

## 快速参考

| API                                                  | 说明                                    |
| ---------------------------------------------------- | --------------------------------------- |
| `import { app, mm } from '@eggjs/mock/bootstrap'`    | 标准测试入口                            |
| `app.httpRequest().get('/path').expect(200)`         | HTTP 接口测试                           |
| `app.getEggObject(Class)`                            | 获取 SingletonProto / ContextProto 实例 |
| `app.mockModuleContextScope(async (ctx) => { ... })` | ContextProto 测试作用域                 |
| `mm(Class.prototype, 'method', fn)`                  | Mock Proto 方法                         |
| `app.mockCsrf()`                                     | 跳过 CSRF 校验（POST 测试必备）         |
| `app.mockHttpclient(url, data)`                      | Mock 外部 HTTP 调用                     |
| `app.getEventWaiter()`                               | 获取 EventBus 事件等待器                |

---

## 常见错误

| 错误写法                           | 正确写法                                      | 说明                        |
| ---------------------------------- | --------------------------------------------- | --------------------------- |
| `import { app } from 'egg'`        | `import { app } from '@eggjs/mock/bootstrap'` | 测试使用 mock 包            |
| `before()` / `after()`             | `beforeAll()` / `afterAll()`                  | Vitest 钩子，不是 Mocha     |
| POST 测试报 403                    | 加 `app.mockCsrf()`                           | 安全插件默认开启 CSRF       |
| 手动写 `afterEach(mm.restore)`     | 不需要                                        | egg-bin 自动注入 mock 恢复  |
| 代码写在 describe 内、hooks 外     | 放入 `beforeAll` / `beforeEach`               | describe 体在加载阶段就执行 |
| `await app.ready()` 配合 bootstrap | 不需要                                        | bootstrap 自动处理生命周期  |

---

## 参考资料

- `references/http-test.md` — HTTP 接口测试
- `references/service-test.md` — Service/DI 对象测试
- `references/mock.md` — Mock 模式
- `references/background-task-test.md` — BackgroundTaskHelper 测试
- `references/eventbus-test.md` — EventBus 测试
