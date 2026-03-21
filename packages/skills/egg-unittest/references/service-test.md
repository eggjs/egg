# Service / DI 对象测试

## 常见错误

| 错误写法                 | 正确写法                                  | 说明                |
| ------------------------ | ----------------------------------------- | ------------------- |
| `ctx.service.user.get()` | `ctx.getEggObject(UserService)`           | 旧写法，新项目用 DI |
| 不 await `getEggObject`  | `const svc = await ctx.getEggObject(Svc)` | 返回 Promise        |

---

## Singleton 测试

`@SingletonProto` 对象直接通过 `app.getEggObject()` 获取：

```typescript
import assert from 'node:assert';
import { app } from '@eggjs/mock/bootstrap';
import { ConfigService } from '../app/modules/foo/ConfigService.ts';

describe('ConfigService', () => {
  it('should get config', async () => {
    const configService = await app.getEggObject(ConfigService);
    const value = configService.get('key');
    assert.equal(value, 'expected');
  });
});
```

---

## ContextProto 测试

`@ContextProto` 对象可以直接通过 `app.getEggObject()` 获取，也可以在 `app.mockModuleContextScope` 中通过 `ctx.getEggObject()` 获取。后者会创建带 DI 生命周期的 ctx，退出时自动销毁：

```typescript
import assert from 'node:assert';
import { app } from '@eggjs/mock/bootstrap';
import { UserService } from '../app/modules/user/UserService.ts';

describe('UserService', () => {
  it('should get user in context scope', async () => {
    await app.mockModuleContextScope(async (ctx) => {
      const userService = await ctx.getEggObject(UserService);
      const user = await userService.getById('1');
      assert(user);
    });
  });
});
```

---

## Mock 被注入的依赖

当 Service A 依赖 Service B 时，mock B 的原型方法：

```typescript
import assert from 'node:assert';
import { app, mm } from '@eggjs/mock/bootstrap';
import { OrderService } from '../app/modules/order/OrderService.ts';
import { PaymentService } from '../app/modules/payment/PaymentService.ts';

describe('OrderService', () => {
  it('should create order with mocked payment', async () => {
    mm(PaymentService.prototype, 'charge', async () => {
      return { transactionId: 'mock-tx-001' };
    });

    const orderService = await app.getEggObject(OrderService);
    const order = await orderService.create({ productId: '1', amount: 100 });
    assert.equal(order.transactionId, 'mock-tx-001');
  });
});
```
