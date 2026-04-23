# HTTP 接口测试

## 常见错误

| 错误写法                                                 | 正确写法                        | 说明                                          |
| -------------------------------------------------------- | ------------------------------- | --------------------------------------------- |
| POST 测试不加 `app.mockCsrf()`                           | 在 POST 前调用 `app.mockCsrf()` | 安全插件默认开启 CSRF，不 mock 会返回 403     |
| `app.httpRequest().get('/').expect(200)` 不 return/await | 必须 `return` 或 `await`        | 否则断言不会执行，测试永远通过                |
| `.expect({ foo: 'bar' })` 用于部分匹配                   | 使用 `result.body` 手动断言     | `.expect(body)` 是全量匹配（deepStrictEqual） |

---

## 基本用法

通过 `app.httpRequest()` 发起 HTTP 请求，返回 SuperTest 对象：

```typescript
import { app } from '@eggjs/mock/bootstrap';

describe('UserController', () => {
  it('should GET /api/users', () => {
    return app.httpRequest().get('/api/users').expect(200).expect({ users: [] });
  });
});
```

---

## POST 请求 + CSRF

POST/PUT/DELETE 请求需要先调用 `app.mockCsrf()` 跳过 CSRF 校验：

```typescript
it('should POST /api/users', () => {
  app.mockCsrf();
  return app
    .httpRequest()
    .post('/api/users')
    .send({ name: 'test', email: 'test@example.com' })
    .expect(200)
    .expect({ id: '1', name: 'test' });
});
```

表单提交使用 `.type('form')`：

```typescript
it('should POST form data', () => {
  app.mockCsrf();
  return app.httpRequest().post('/api/login').type('form').send({ username: 'admin', password: '123' }).expect(200);
});
```

---

## 请求构造

```typescript
app
  .httpRequest()
  .get('/api/users')
  .set('Authorization', 'Bearer token123') // 设置 header
  .set('Accept', 'application/json') // 设置 Accept
  .query({ page: 1, limit: 10 }) // 查询参数
  .expect(200);
```

---

## 响应断言

使用 `.expect()` 链式断言：

```typescript
import assert from 'node:assert';
import { app } from '@eggjs/mock/bootstrap';

it('should validate response', () => {
  return app
    .httpRequest()
    .get('/api/users/1')
    .expect(200) // 只校验状态码
    .expect({ id: '1', name: 'test' }) // 只校验 body（deepStrictEqual）
    .expect(200, { id: '1', name: 'test' }) // 状态码 + body 合并
    .expect('hello world') // body 字符串匹配
    .expect(/hello/) // body 正则匹配
    .expect('content-type', /json/) // header 匹配
    .expect([200, 302]) // 多状态码匹配（任一即可）
    .expect((res) => {
      // 自定义断言函数
      assert(res.body.id);
    });
});
```

使用 `result` 做更灵活的断言：

```typescript
import assert from 'node:assert';
import { app } from '@eggjs/mock/bootstrap';

it('should validate response', async () => {
  const result = await app.httpRequest().get('/api/users/1');

  assert.equal(result.status, 200);
  assert.equal(result.body.name, 'test');
  assert(result.body.id);
  assert.match(result.headers['content-type'], /json/);
});
```

完整的请求构造和断言 API 可查看项目 node_modules 中 `@eggjs/supertest` 的类型定义。

---

## 端到端示例

```typescript
import assert from 'node:assert';
import { app } from '@eggjs/mock/bootstrap';

describe('test/controller/user.test.ts', () => {
  describe('GET /api/users/:id', () => {
    it('should return user', () => {
      return app.httpRequest().get('/api/users/1').expect(200).expect({ id: '1', name: 'test' });
    });

    it('should return 404 when user not found', () => {
      return app.httpRequest().get('/api/users/999').expect(404);
    });
  });

  describe('POST /api/users', () => {
    it('should create user', () => {
      app.mockCsrf();
      return app.httpRequest().post('/api/users').send({ name: 'new user', email: 'new@example.com' }).expect(201);
    });

    it('should return 422 with invalid params', () => {
      app.mockCsrf();
      return app.httpRequest().post('/api/users').send({ name: '' }).expect(422);
    });
  });
});
```
