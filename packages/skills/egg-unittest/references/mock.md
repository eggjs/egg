# Mock 模式

## 常见错误

| 错误写法                       | 正确写法                                   | 说明                           |
| ------------------------------ | ------------------------------------------ | ------------------------------ |
| `mm(service, 'method', fn)`    | `mm(ServiceClass.prototype, 'method', fn)` | DI 对象需 mock 原型，不是实例  |
| 手动写 `afterEach(mm.restore)` | 不需要                                     | egg-bin 自动注入 mock 恢复     |
| `new Ajv()` mock 单独实例      | mock 原型方法                              | DI 容器管理的对象通过原型 mock |

---

## mm() — Mock Proto 方法

最常用的 mock 方式，mock DI 对象的原型方法：

```typescript
import assert from 'node:assert';
import { app, mm } from '@eggjs/mock/bootstrap';
import { UserService } from '../app/modules/user/UserService.ts';
import { OrderService } from '../app/modules/order/OrderService.ts';

describe('OrderService', () => {
  it('should mock user service', async () => {
    mm(UserService.prototype, 'getById', async () => {
      return { id: '1', name: 'mocked user' };
    });

    const orderService = await app.getEggObject(OrderService);
    const result = await orderService.createForUser('1');
    assert.equal(result.userName, 'mocked user');
  });
});
```

mock 函数会自动记录调用信息，可以用来断言调用参数：

```typescript
import assert from 'node:assert';
import { app, mm } from '@eggjs/mock/bootstrap';
import { NotifyService } from '../app/modules/notify/NotifyService.ts';
import { OrderService } from '../app/modules/order/OrderService.ts';

it('should call notify with correct args', async () => {
  const mockFn = async (userId: string, message: string) => {};
  mm(NotifyService.prototype, 'send', mockFn);

  const orderService = await app.getEggObject(OrderService);
  await orderService.create({ productId: '1' });

  assert.equal(mockFn.called, 1); // 调用次数
  assert.deepStrictEqual(mockFn.lastCalledArguments, ['user-1', '订单创建成功']); // 最后一次调用参数
  // mockFn.calledArguments — 所有调用参数的数组
});
```

---

## mm.spy() — 不替换实现，只记录调用

```typescript
it('should spy on method', async () => {
  mm.spy(NotifyService.prototype, 'send');

  const orderService = await app.getEggObject(OrderService);
  await orderService.create({ productId: '1' });

  // 原方法正常执行，同时记录了调用信息
  const sendFn = NotifyService.prototype.send;
  assert.equal(sendFn.called, 1);
  assert.equal(sendFn.lastCalledArguments[0], 'user-1');
});
```

---

## app.mockHttpclient() — Mock HttpClient 请求

Mock 通过 `@Inject() httpclient: HttpClient` 注入的 HttpClient 发送的请求：

```typescript
it('should mock external API', () => {
  app.mockHttpclient('https://api.example.com/users', {
    data: JSON.stringify({ name: 'test' }),
  });

  return app.httpRequest().get('/api/proxy/users').expect(200).expect({ name: 'test' });
});
```

---

## app.mockCsrf() — 跳过 CSRF

POST/PUT/DELETE 测试时跳过 CSRF 校验：

```typescript
it('should POST without CSRF error', () => {
  app.mockCsrf();
  return app.httpRequest().post('/api/users').send({ name: 'test' }).expect(200);
});
```

---

## Mock 恢复

egg-bin 自动注入 `@eggjs/mock/setup_vitest`，会在 `afterEach` 钩子中自动调用 `mm.restore()`，无需手动编写。
