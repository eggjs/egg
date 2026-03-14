# Inject 开发指南

## 基本用法

使用 `@Inject()` 注入其他 Proto 对象或 Egg 内置对象：

```typescript
import { SingletonProto, Inject } from 'egg';

@SingletonProto()
export class OrderService {
  @Inject()
  userService: UserService; // 按类型自动匹配

  @Inject({ name: 'customName' })
  config: any; // 按名称匹配

  @Inject('shorthand')
  other: any; // 字符串简写，等同于 { name: 'shorthand' }
}
```

## 名称解析规则

框架按以下优先级确定注入目标：

1. **显式指定 name** — `@Inject({ name: 'xxx' })` 或 `@Inject('xxx')`
2. **类型元数据自动关联** — 当属性类型是使用了 `@SingletonProto()` 或 `@ContextProto()` 装饰器的 class 时，框架自动从类型元数据匹配对应的 Proto 对象。此时属性名可以任意取值，不影响注入结果
3. **属性名兜底** — 当类型为 `interface`、`any`、`unknown` 等无法获取运行时元信息的类型时，使用属性名作为注入名称

```typescript
@SingletonProto()
export class MyService {
  @Inject()
  fooService: FooService; // 优先级 2：从 FooService 类型自动关联

  @Inject()
  whatever: FooService; // 优先级 2：同样生效，属性名不影响匹配

  @Inject({ name: 'bar' })
  baz: FooService; // 优先级 1：显式 name → "bar"

  @Inject()
  something: any; // 优先级 3：类型无元数据，回退到属性名 → "something"
}
```

## 可选注入

默认情况下，注入目标不存在会在启动时报错。使用 `optional` 可以跳过不存在的依赖：

```typescript
import { SingletonProto, Inject, InjectOptional } from 'egg';

@SingletonProto()
export class MyService {
  @Inject({ optional: true })
  maybeService?: SomeService; // 不存在时为 undefined

  @InjectOptional()
  anotherOptional?: OtherService; // 简写方式，效果相同
}
```

## 构造函数注入

除了属性注入，也支持构造函数参数注入：

```typescript
import { SingletonProto, Inject } from 'egg';

@SingletonProto()
export class MyService {
  constructor(
    @Inject() readonly fooService: FooService,
    @Inject({ optional: true }) readonly barService?: BarService,
  ) {}
}
```

**注意：构造函数注入和属性注入不能混用。** 一个 class 只能选择其中一种方式，否则框架会报错。

## 注入 Egg 内置对象

框架会自动遍历 `Application` 和 `Context` 对象的所有属性，均可通过 `@Inject()` 注入。

#### 注入配置

```typescript
import { Inject, SingletonProto, EggAppConfig } from 'egg';

@SingletonProto()
class Foo {
  @Inject()
  config: EggAppConfig;

  bar(): void {
    console.log('current env is %s', this.config.env);
  }
}
```

#### 注入 Logger

专为 logger 做了优化，可以直接注入 custom logger：

```typescript
import { Inject, SingletonProto, Logger } from 'egg';

@SingletonProto()
class FooService {
  @Inject()
  logger: Logger; // 注入 ${appname}-web.log

  @Inject()
  coreLogger: Logger; // 注入 egg-web.log

  @Inject()
  fooLogger: Logger; // 注入 customLogger 中配置的 fooLogger
}
```

#### 注入 Service

> 强烈建议把 Egg Service 的代码通过 Proto 重新封装再注入。对于已有的 Service，可以通过以下方式引入：

```typescript
import { EggLogger, Service, Inject, SingletonProto } from 'egg';

@SingletonProto()
class FooService {
  @Inject()
  service: Service; // 注入整个 ctx.service

  get xxxService() {
    return this.service.xxxService;
  }
}
```

#### 注入 HttpClient

```typescript
import { Inject, SingletonProto, HttpClient } from 'egg';

@SingletonProto()
class Foo {
  @Inject()
  httpClient: HttpClient;

  async bar(): Promise<void> {
    await this.httpClient.request('https://example.com');
  }
}
```

## 注入模块配置

在模块根目录创建 `module.yml`，通过 `moduleConfig` 名称注入，框架自动注入当前模块的配置：

```yaml
# module.yml
apiEndpoint: https://api.example.com
retryCount: 3
```

```typescript
import { SingletonProto, Inject } from 'egg';

interface ModuleConfig {
  apiEndpoint: string;
  retryCount: number;
}

@SingletonProto()
export class ApiService {
  @Inject()
  moduleConfig: ModuleConfig;

  async call(): Promise<void> {
    // this.moduleConfig.apiEndpoint → "https://api.example.com"
  }
}
```

如需注入其他模块的配置，使用 `@ConfigSourceQualifier` 指定模块名：

```typescript
import { SingletonProto, Inject, ConfigSourceQualifier } from 'egg';

@SingletonProto()
export class MyService {
  @Inject()
  @ConfigSourceQualifier('otherModule')
  moduleConfig: OtherModuleConfig; // 注入 otherModule 的配置
}
```

## Qualifier 限定符

当同名对象存在多个实现时，使用限定符消歧义：

### @InitTypeQualifier

指定注入 Singleton 还是 Context 实例：

```typescript
import { SingletonProto, Inject, InitTypeQualifier, ObjectInitType } from 'egg';

@SingletonProto()
export class MyService {
  @Inject()
  @InitTypeQualifier(ObjectInitType.CONTEXT)
  barService: BarService; // 强制注入 ContextProto 版本
}
```

> 大多数情况下不需要手动指定，框架会根据类型元数据自动推导。

### @EggQualifier

当 `app` 和 `ctx` 上存在同名属性时，框架默认优先匹配 `ctx`。使用 `@EggQualifier` 显式指定来源：

```typescript
import { SingletonProto, Inject, EggQualifier, EggType } from 'egg';

@SingletonProto()
export class MyService {
  @Inject()
  @EggQualifier(EggType.APP)
  someProp: any; // 强制从 app 注入

  @Inject()
  @EggQualifier(EggType.CONTEXT)
  someProp2: any; // 强制从 ctx 注入
}
```

### @ModuleQualifier

指定从哪个模块注入：

```typescript
import { SingletonProto, Inject, ModuleQualifier } from 'egg';

@SingletonProto()
export class MyService {
  @Inject()
  @ModuleQualifier('userModule')
  userService: UserService; // 明确从 userModule 注入
}
```

## 重要约束

- **不能有循环依赖**：Proto 之间或模块之间都不能形成循环引用
- **不能有同名对象**：同一模块内不能存在相同名称和相同初始化类型的 Proto
- **按需注入**：不要直接注入 `app` 或 `ctx`，按需注入具体的属性（如 `logger`、`config`）
