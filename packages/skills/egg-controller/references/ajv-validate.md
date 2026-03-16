# Ajv 参数校验指南

## 常见错误

| 错误写法                         | 正确写法                          | 说明                                           |
| -------------------------------- | --------------------------------- | ---------------------------------------------- |
| `import { Type } from 'typebox'` | `import { Type } from 'egg/ajv'`  | 必须从 `egg/ajv` 导入，内部已封装 typebox      |
| `import { Ajv } from 'ajv'`      | `import { Ajv } from 'egg/ajv'`   | Ajv 实例通过 `egg/ajv` 导出                    |
| `new Ajv()` 手动创建实例         | `@Inject() ajv: Ajv` 注入全局单例 | 框架已配置好 formats 和 keywords，不要自行创建 |

## | 在 Service 中做参数校验 | 在 Controller 中做参数校验 | 入参校验应在 Controller 层完成 |

## 核心概念

Egg 通过 `@eggjs/typebox-validate` 插件集成 Ajv（JSON Schema 校验库）和 TypeBox（TypeScript-first 的 JSON Schema 构建器）。**定义一次 Schema，同时获得参数校验和 TypeScript 类型推导。**

### 导入路径

```typescript
// 所有 Ajv/TypeBox 相关导入统一从 egg/ajv
import { Ajv, Type, Static, TransformEnum } from 'egg/ajv';
```

---

## 使用方式

通过 `@Inject()` 注入全局 Ajv 单例，在 Controller 方法中调用 `ajv.validate()` 进行校验。

### 完整示例

```typescript
// app/modules/demo/FooController.ts
import {
  HTTPController,
  HTTPMethod,
  HTTPMethodEnum,
  HTTPBody,
  Inject,
} from 'egg';
import { Ajv, Type, Static, TransformEnum } from 'egg/ajv';

// 1. 定义 Schema
const CreateUserSchema = Type.Object({
  name: Type.String({
    transform: [TransformEnum.trim],
    minLength: 1,
    maxLength: 50,
  }),
  email: Type.String({ format: 'email' }),
  age: Type.Optional(Type.Integer({ minimum: 0, maximum: 150 })),
});

// 2. 从 Schema 推导类型
type CreateUserParams = Static<typeof CreateUserSchema>;

// 3. 在 Controller 中注入 Ajv 并校验
@HTTPController()
export class UserController {
  @Inject()
  private readonly ajv: Ajv;

  @HTTPMethod({
    method: HTTPMethodEnum.POST,
    path: '/api/users',
  })
  async create(@HTTPBody() body: CreateUserParams) {
    // 校验失败自动抛出 AjvInvalidParamError（422）
    this.ajv.validate(CreateUserSchema, body);

    // 校验通过，body 已经有完整类型提示
    return { name: body.name, email: body.email };
  }
}
```

---

## Schema 定义

### 常用类型

```typescript
import { Type } from 'egg/ajv';

Type.String()                                      // string
Type.Number()                                      // number
Type.Integer()                                     // 整数
Type.Boolean()                                     // boolean
Type.Optional(Type.String())                       // string | undefined
Type.Array(Type.String())                          // string[]
Type.Object({ name: Type.String() })               // { name: string }
Type.Union([Type.String(), Type.Number()])          // string | number
Type.Literal('admin')                              // 'admin'
```

完整的 TypeBox JSON Schema 类型定义参考：https://github.com/sinclairzx81/typebox#json-types

### 内置 format 校验

框架通过 `ajv-formats` 预注册了以下格式：

| format      | 说明       | 示例                                   |
| ----------- | ---------- | -------------------------------------- |
| `email`     | 邮箱       | `user@example.com`                     |
| `uri`       | URI        | `https://example.com`                  |
| `uuid`      | UUID       | `550e8400-e29b-41d4-a716-446655440000` |
| `date`      | 日期       | `2024-01-01`                           |
| `date-time` | 日期时间   | `2024-01-01T00:00:00Z`                 |
| `time`      | 时间       | `12:00:00`                             |
| `ipv4`      | IPv4       | `192.168.1.1`                          |
| `ipv6`      | IPv6       | `::1`                                  |
| `hostname`  | 主机名     | `example.com`                          |
| `regex`     | 正则表达式 | `^\\d+$`                               |

```typescript
Type.String({ format: 'email' })
Type.String({ format: 'uuid' })
Type.String({ format: 'date-time' })
```

### transform 预处理

通过 `ajv-keywords` 的 `transform` 关键字，在校验前对字符串做预处理：

```typescript
import { TransformEnum } from 'egg/ajv';

Type.String({
  transform: [TransformEnum.trim],               // 去除首尾空格
})

Type.String({
  transform: [TransformEnum.trim, TransformEnum.toLowerCase],  // 去空格 + 转小写
})
```

---

## 最佳实践

- **Schema 与 Controller 同文件** — Schema 定义放在使用它的 Controller 文件中，保持就近原则
- **校验在 Controller 层** — 不要在 Service 层做入参校验，Service 信任上层传入的数据
- **善用 Optional** — 非必填字段用 `Type.Optional()` 包装，避免前端遗漏字段导致 422
- **善用 transform** — 对用户输入做 trim 预处理，减少脏数据
