# Proto 开发指南

## SingletonProto vs ContextProto

|          | SingletonProto     | ContextProto       |
| -------- | ------------------ | ------------------ |
| 创建时机 | 应用启动时立即创建 | 请求到达时按需创建 |
| 实例数量 | 整个应用 1 个      | 每个请求 1 个      |
| 销毁时机 | 应用关闭           | 请求结束           |

**决策逻辑：默认使用 `@SingletonProto()`**，性能更好。只有当需要在多个服务间共享请求级隔离状态时，才使用 `@ContextProto()`。

```typescript
import { SingletonProto, ContextProto } from 'egg';

// ✅ 默认选择：无状态服务用 SingletonProto
@SingletonProto()
export class UserService {
  async findUser(id: string): Promise<User> {
    // 无需请求级状态，适合 Singleton
  }
}

// 仅在需要请求级隔离时使用 ContextProto
@ContextProto()
export class RequestContext {
  traceId: string;
  userId: string;
  // 每个请求独立的状态
}
```

## 装饰器参数

`@SingletonProto()` 和 `@ContextProto()` 接受相同的可选参数：

| 参数          | 类型        | 默认值         | 说明                                 |
| ------------- | ----------- | -------------- | ------------------------------------ |
| name          | string      | 类名首字母小写 | 实例名称                             |
| accessLevel   | AccessLevel | PRIVATE        | 跨模块可见性                         |
| protoImplType | string      | 'DEFAULT'      | 实现类型标记（高级用法，一般不需要） |

名称推导规则：类名首字母自动转小写，如 `MyService` → `myService`。

```typescript
import { SingletonProto, AccessLevel } from 'egg';

// 使用默认参数：name 为 "helloService"，accessLevel 为 PRIVATE
@SingletonProto()
export class HelloService {}

// 自定义参数
@SingletonProto({
  name: 'customName',
  accessLevel: AccessLevel.PUBLIC,
})
export class HelloService {}
```

## 注入规则

**SingletonProto 可以注入 ContextProto**，框架会自动处理生命周期差异。

实现机制：框架不会直接注入 ContextProto 实例，而是通过 lazy getter/Proxy，在每次访问时从当前请求上下文动态解析，确保每个请求拿到各自的实例。

```typescript
import { SingletonProto, ContextProto, Inject } from 'egg';

@ContextProto()
export class RequestContext {
  userId: string;
}

@SingletonProto()
export class AppService {
  @Inject()
  requestContext: RequestContext; // ✅ 每次访问自动解析当前请求的实例
}
```

ContextProto 也可以注入 SingletonProto：

```typescript
@ContextProto()
export class RequestHandler {
  @Inject()
  appService: AppService; // ✅ 直接注入
}
```

## AccessLevel 跨模块访问

- `AccessLevel.PRIVATE`（默认）：仅同模块内可注入
- `AccessLevel.PUBLIC`：跨模块可注入

模块边界由 `package.json` 中的 `eggModule.name` 决定。

```typescript
// userModule 中
@SingletonProto({ accessLevel: AccessLevel.PUBLIC })
export class UserService {}

// orderModule 中
@SingletonProto()
export class OrderService {
  @Inject()
  userService: UserService; // ✅ UserService 是 PUBLIC，跨模块可注入
}
```

```typescript
// userModule 中
@SingletonProto() // 默认 PRIVATE
export class UserHelper {}

// orderModule 中
@SingletonProto()
export class OrderService {
  @Inject()
  userHelper: UserHelper; // ❌ 报错：UserHelper 是 PRIVATE，不能跨模块注入
}
```

## 生命周期

Proto 对象支持以下生命周期钩子，按执行顺序排列：

| 阶段 | 装饰器                      | 说明                             |
| ---- | --------------------------- | -------------------------------- |
| 1    | constructor                 | 构造函数                         |
| 2    | `@LifecyclePostConstruct()` | 构造完成后                       |
| 3    | `@LifecyclePreInject()`     | 注入前                           |
| 4    | —                           | 依赖注入                         |
| 5    | `@LifecyclePostInject()`    | 注入完成后                       |
| 6    | `@LifecycleInit()`          | 异步初始化（对象就绪前最后一步） |
| 7    | —                           | **对象就绪，可被使用**           |
| 8    | `@LifecyclePreDestroy()`    | 销毁前                           |
| 9    | `@LifecycleDestroy()`       | 销毁，用于清理资源               |

常用的是 `@LifecycleInit()` 和 `@LifecycleDestroy()`。

**示例 1：SingletonProto 异步初始化和资源清理**

```typescript
import { SingletonProto, LifecycleInit, LifecycleDestroy } from 'egg';

@SingletonProto()
export class DatabaseService {
  private connection: Connection;

  @LifecycleInit()
  async init(): Promise<void> {
    this.connection = await createConnection();
  }

  @LifecycleDestroy()
  async destroy(): Promise<void> {
    await this.connection.close();
  }
}
```

**示例 2：ContextProto 在注入完成后初始化状态**

```typescript
import { ContextProto, Inject, LifecyclePostInject } from 'egg';

@ContextProto()
export class RequestTracer {
  @Inject()
  traceService: TraceService;

  traceId: string;

  @LifecyclePostInject()
  async postInject(): Promise<void> {
    // 依赖注入完成后，利用注入的服务初始化状态
    this.traceId = await this.traceService.generateTraceId();
  }
}
```
