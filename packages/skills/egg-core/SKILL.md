---
name: egg-core
description: 本技能用于处理 EGG 基础核心概念，包括模块架构、@SingletonProto、@ContextProto、@Inject 装饰器和动态注入。用于理解 EGG 的基础构建块、依赖注入、对象生命周期管理和运行时多实现动态选择。
allowed-tools: Read
---

# egg 核心概念

## Step 1: 代码写在 module 中

### 什么是模块？

模块是 EGG 中基础的代码组织单元。只有模块内的代码会被框架扫描和加载。模块之间相互独立，但可以通过 `@Inject` 装饰器访问其他模块的对象。

### 定义 module

在目录中添加包含 `eggModule.name` 字段的 `package.json` 文件来声明该目录为模块：

```json
{
  "name": "foo",
  "eggModule": {
    "name": "foo"
  }
}
```

**重要提示**：模块名称不能包含 `-` 或其他特殊字符；使用驼峰命名规则。

#### 正确示例

```
app/
└── userModule/           ✅ 驼峰命名
    ├── package.json
    │   └── { "eggModule": { "name": "userModule" } }
    └── service.ts        ✅ 会被框架加载
```

#### 错误示例

```
app/
├── user-module/          ❌ 名称包含 `-`
│   └── package.json
│       └── { "eggModule": { "name": "user-module" } }
│
└── common/               ❌ 缺少 package.json（不是 module）
    └── utils.ts          ❌ 不会被框架加载
```

#### 模块配置

在模块根目录创建 `module.yml` 用于模块特定配置：

```yaml
foo: bar
```

通过 `@Inject()` 注入配置，使用 `moduleConfig`：

```typescript
import { SingletonProto, Inject } from 'egg';

interface ModuleConfig {
  foo: string;
}

@SingletonProto()
export class ConfigService {
  @Inject()
  private readonly moduleConfig: ModuleConfig;

  async hello(): Promise<string> {
    return `hello ${this.moduleConfig.foo}`;
  }
}
```

#### 模块组织最佳实践

- 新应用：按功能在 `app/` 目录中组织
- 存量应用：保留老的 egg 代码在 `app/controller`/`app/service`，将新增的 module 代码放在 `app/module/`
- 可以在 `dependencies` 中导入 npm 包作为额外模块

## Step 2: 用 Proto 实现 Service

### SingletonProto

应用启动时立即创建，整个应用生命周期内只有一个实例，性能更好，应该作为默认选择。

```typescript
import { SingletonProto } from 'egg';

@SingletonProto()
export class HelloService {
  async hello(): Promise<string> {
    return 'hello';
  }
}
```

### ContextProto

请求到达时按需创建，每个请求一个实例，请求结束自动销毁。仅在需要隔离不同请求的上下文信息时使用。

```typescript
import { ContextProto } from 'egg';

@ContextProto()
export class RequestContext {
  userId: string;
}
```

**重要提示**：大多数服务应该使用 `SingletonProto` 以获得更好的性能。只有当请求上下文必须在服务之间共享以确保请求之间隔离时，才使用 `ContextProto`。

### AccessLevel

proto 对象默认 accessLevel 为 `AccessLevel.PRIVATE`，仅在当前 module 内使用。可以设置为 `AccessLevel.PUBLIC`，进行跨模块访问。

```typescript
import { AccessLevel, ContextProto, SingletonProto } from 'egg';

@SingletonProto({ accessLevel: AccessLevel.PUBLIC })
export class SharedService {}

@ContextProto({ accessLevel: AccessLevel.PUBLIC })
export class SharedContextService {}
```

## Step 3: 通过 Inject 使用 Service

### 基本用法

使用 `@Inject()` 注入其他 Proto 或 Egg 对象：

```typescript
import { Inject, Logger, SingletonProto } from 'egg';
import { FooService } from './FooService.ts';

@SingletonProto()
export class HelloService {
  @Inject()
  fooService: FooService;  // 注入另一个 Proto

  @Inject()
  logger: Logger;  // 注入 Egg 对象

  async hello(): Promise<string> {
    this.logger.info(`[HelloService] ${this.fooService.hello()}`);
  }
}
```

### 动态注入

当同一个抽象有多种实现，需要在运行时动态选择时，通过 `EggObjectFactory` 按类型获取实现，无需 if/else。详见 `references/dynamic-inject.md`。

### 重要约束

- **不能有循环依赖**：Proto 或模块之间都不能有循环依赖
- **不能有同名对象**：一个模块不能有相同名称和初始化类型的 Proto
- **按需注入**：不要直接注入 `app` 或 `ctx`，按需注入特定对象

## 快速决策指南

| 场景                             | 使用装饰器                                             |
| -------------------------------- | ------------------------------------------------------ |
| 无状态服务                       | `@SingletonProto()`                                    |
| 跨服务共享的请求级状态           | `@ContextProto()`                                      |
| 需要跨模块访问                   | `@SingletonProto({ accessLevel: AccessLevel.PUBLIC })` |
| 注入依赖                         | `@Inject()`                                            |
| 使用自定义名称注入               | `@Inject({ name: 'customName' })`                      |
| 同一抽象多种实现，运行时动态选择 | `QualifierImplDecoratorUtil` + `EggObjectFactory`      |

## 常见问题排查

| 现象                   | 原因                                       | 解决方案                                     |
| ---------------------- | ------------------------------------------ | -------------------------------------------- |
| 模块没被加载           | `eggModule.name` 包含 `-` 等特殊字符       | 改为驼峰命名                                 |
| `EggPrototypeNotFound` | 跨模块注入但 accessLevel 为 PRIVATE        | 改为 `AccessLevel.PUBLIC`                    |
| 注入对象不对           | 类型为 `interface`/`any`，回退到属性名匹配 | 改用 class 类型或 `@Inject({ name: 'xxx' })` |
| 混用注入方式报错       | 属性注入和构造函数注入不能混用             | 统一使用一种方式                             |
| 可选依赖启动报错       | 缺少 optional 标记                         | `@Inject({ optional: true })`                |

## 参考资料

- 详细的 module 文档，请参阅：`references/module.md`
- Inject 装饰器使用，请参阅：`references/inject.md`
- SingletonProto 和 ContextProto 详情，请参阅：`references/proto.md`
- 动态注入（Qualifier 动态注入），请参阅：`references/dynamic-inject.md`
