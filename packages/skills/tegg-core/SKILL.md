---
name: egg-core
description: 本技能用于处理 EGG 基础核心概念，包括模块架构、@SingletonProto、@ContextProto 和 @Inject 装饰器。用于理解 EGG 的基础构建块、依赖注入和对象生命周期管理。
allowed-tools: Read
---

# EGG 核心概念

## 概述

EGG 是一个基于 TypeScript 的企业应用框架，提供装饰器驱动的依赖注入和基于模块的架构。本技能涵盖核心概念：模块架构、对象生命周期（SingletonProto/ContextProto）和依赖注入（Inject）。

## 模块架构

### 什么是模块？

模块是 EGG 中基础的代码组织单元。只有模块内的控制器、原型和其他对象会被框架扫描和加载。模块之间相互独立，但可以通过 `@Inject` 装饰器访问其他模块的对象。

### 定义模块

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

### 模块发现

**自动扫描**（默认）：
- 框架扫描最多 10 层目录
- 查找所有在 `package.json` 中有 `eggModule.name` 的目录
- 同时扫描 `dependencies` 中有 `eggModule.name` 的 npm 包

**手动声明**（仅标准应用，通过 `config/module.json`）：
```json
[
  { "path": "../app/module-a" },
  { "package": "@alipay/common-module" }
]
```

### 模块配置

在模块根目录创建 `module.yml` 用于模块特定配置：

```yaml
oneapi:
  - appname: eggmosn
    api:
      EchoFacade: {}
foo: bar
```

通过 `@Inject()` 注入配置，使用 `moduleConfig`：

```typescript
interface ModuleConfig {
  foo: string;
}

@SingletonProto({ accessLevel: AccessLevel.PUBLIC })
export class ConfigService {
  @Inject()
  private readonly moduleConfig: ModuleConfig;

  async hello(): Promise<string> {
    return `hello ${this.moduleConfig.foo}`;
  }
}
```

### 模块组织（最佳实践）

- 新应用：按功能在 `app/` 目录中组织
- 存量应用：保留存量代码在 `app/controller`/`app/service`，将模块放在 `app/module/`

- 可以在 `dependencies` 中导入 npm 包作为额外模块

## 对象生命周期：SingletonProto vs ContextProto

### SingletonProto

**定义**：在整个应用生命周期内只实例化一次。由于只全局初始化一个对象，可以提升性能。

**使用场景**：
- 大多数服务的默认选择
- 不存储请求上下文的无状态服务
- 可以注入 ContextProto 对象

**装饰器模式**：
```typescript
@SingletonProto({
  name?: string,              // 可选的实例名称
  accessLevel?: AccessLevel   // PRIVATE 或 PUBLIC（默认：PRIVATE）
})
```

**示例**：
```typescript
@SingletonProto()
export class HelloService {
  async hello(): Promise<string> {
    return 'hello';
  }
}

@SingletonProto({
  name: 'worldInterface',  // 自定义引用名称
  accessLevel: AccessLevel.PUBLIC  // 跨模块可用
})
export class WorldService {
  async world(): Promise<string> {
    return 'world!';
  }
}
```

### ContextProto

**定义**：每个请求都会创建一个新实例。

**使用场景**：
- 存储必须在服务之间共享的请求上下文信息
- 需要不同请求之间的隔离

**装饰器模式**：
```typescript
@ContextProto({
  name?: string,              // 可选的实例名称
  accessLevel?: AccessLevel   // PRIVATE 或 PUBLIC（默认：PRIVATE）
})
```

**示例**：
```typescript
@ContextProto()
export class RequestContext {
  userId: string;
  traceId: string;
}

@SingletonProto()
export class UserService {
  @Inject()
  requestContext: RequestContext;

  async getProfile(): Promise<object> {
    return { userId: this.requestContext.userId };
  }
}
```

**重要提示**：大多数服务应该使用 `SingletonProto` 以获得更好的性能。只有当请求上下文必须在服务之间共享以确保请求之间隔离时，才使用 `ContextProto`。

### AccessLevel

- `AccessLevel.PRIVATE`：仅在相同模块内可访问（默认）
- `AccessLevel.PUBLIC`：可从其他模块访问

## 依赖注入：@Inject

### 基本用法

使用 `@Inject()` 注入其他 Proto 或 Egg 对象：

```typescript
@SingletonProto()
export class HelloService {
  @Inject()
  fooService: FooService;  // 注入另一个 Proto

  @Inject()
  logger: EggLogger;  // 注入 Egg 对象

  async hello(user: User): Promise<string> {
    this.logger.info(`[HelloService] ${this.fooService.hello()}`);
  }
}
```

### @Inject 参数

```typescript
@Inject({
  name?: string,   // 实例名称（默认：属性名称）
  proto?: string   // Proto 名称（默认：属性名称）
})
```

### 注入配置示例

使用自定义名称：
```typescript
@SingletonProto()
export class Foo {
  @Inject({ name: 'worldInterface' })
  worldService: WorldService;
}
```

### 解决命名冲突

**模块内冲突**（相同名称，不同初始化类型）：
```typescript
@SingletonProto()
export class HelloService {
  @Inject()
  @InitTypeQualifier(ObjectInitType.CONTEXT)
  logger: EggLogger;  // 指定 CONTEXT 级别的 logger
}
```

**跨模块冲突**：
```typescript
@SingletonProto()
export class HelloService {
  @Inject()
  @ModuleQualifier('foo')  // 指定模块名称
  helloAdapter: HelloAdapter;
}
```

### 注入 Egg 对象

**配置**：
```typescript
@SingletonProto()
class Foo {
  @Inject()
  config: EggAppConfig;
}
```

**日志**：
```typescript
@SingletonProto()
class FooService {
  @Inject()
  logger: EggLogger;  // 应用特定的 logger

  @Inject()
  coreLogger: EggLogger;  // 核心 logger

  @Inject()
  fooLogger: EggLogger;  // 配置中的自定义 logger
}
```

**服务**：
```typescript
@SingletonProto()
class FooService {
  @Inject()
  service: Service;

  get xxxService() {
    return this.service.xxxService;
  }
}
```

**HttpClient**：
```typescript
@SingletonProto()
class Foo {
  @Inject()
  httpclient: EggHttpClient;
}
```

## 重要约束

- **无循环依赖**：Proto 或模块之间都不能有循环依赖
- **无同名冲突**：一个模块不能有相同名称和初始化类型的 Proto
- **只注入需要的对象**：不要直接注入 `app` 或 `ctx`；注入特定对象

## 快速决策指南

| 场景 | 使用装饰器 |
|------|----------|
| 无状态服务 | `@SingletonProto()` |
| 跨服务共享的请求级状态 | `@ContextProto()` |
| 需要跨模块访问 | `@SingletonProto({ accessLevel: AccessLevel.PUBLIC })` |
| 注入依赖 | `@Inject()` |
| 使用自定义名称注入 | `@Inject({ name: 'customName' })` |
| 从特定模块注入 | `@Inject() @ModuleQualifier('moduleName')` |
| 注入特定初始化类型 | `@Inject() @InitTypeQualifier(ObjectInitType.CONTEXT)` |

## 最佳实践

- 默认使用 `@SingletonProto()` 以获得更好的性能
- 只有在需要隔离和共享请求上下文时才使用 `@ContextProto()`
- 只有在真正需要跨模块访问时才使用 `AccessLevel.PUBLIC`
- 按业务领域或功能组织模块
- 保持模块小巧且专注

## 参考资料

详细的模块文档，请参阅：`references/module.md`

Inject 装饰器使用，请参阅：`references/inject.md`

SingletonProto 详情，请参阅：`references/singleton-proto.md`

ContextProto 详情，请参阅：`references/context-proto.md`
