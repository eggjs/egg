---
title: '插件升级'
description: 'Egg 4 的研发体验与生态维护实践：插件升级'
---

# 插件升级

Egg 的插件承担了框架的大量实际能力：会话、上传、静态资源、错误处理，以及数据库和模板引擎集成。Egg 4 中，这些能力陆续迁入同一 Monorepo，并向 TypeScript 源码、@eggjs 命名空间和可导入的配置工厂靠拢。对使用者来说，变化的重点是插件更容易被发现、配置和验证；对作者来说，类型、依赖与初始化时机需要更明确地表达。

应用可以通过插件工厂启用可选能力，用 TypeBox 连接校验与类型，并在测试环境替换 Redis 客户端。插件作者则可以把类型、依赖和资源生命周期放在同一套接口中维护。

## 先分清内置能力与按需集成

把插件放进官方仓库，首先改变的是维护方式。相关代码可以与核心一起调整、测试和发布，应用运行时是否加载它，仍由插件配置决定。当前 plugins 目录有 18 个包，传统内置配置引用其中 12 个，覆盖错误处理、会话、安全、文件上传、开发辅助等既有能力。development 还带有 local 环境限制，因此[默认配置](https://github.com/eggjs/egg/blob/a11a6d5046c445307767086cd437f4456af04224/packages/egg/src/config/plugin.ts)中出现的插件也不一定在所有环境执行。

Redis、TypeBox 校验、Nunjucks、CORS 和 tracer 是按需启用的插件；Mock 则服务于测试。这条边界有直接的使用意义：内置 view 提供视图抽象，并不意味着应用已经获得 Nunjucks 渲染器；仓库包含 redis，也不会让每个 Egg 应用自动创建 Redis 连接。Tegg 另有自己的默认集成，判断某个能力是否启用时，应同时查看框架与应用的最终配置。

官方插件采用 @eggjs 命名空间。已有应用无需为所有内置能力逐个补写启用代码；真正需要检查的是自己显式安装、覆写或直接导入的旧 egg-\* 包，以及它们与当前 Egg 主版本的兼容范围。

## 把插件配置变成可导入的接口

过去常见的配置依赖插件名、包名字符串和 package.json 中的元数据。现在，官方插件可以直接导出工厂函数，应用通过 import 找到插件，再展开工厂返回的配置。以 Redis 和 TypeBox 为例，下面的 config/plugin.ts 同时启用两个可选插件。导入路径能由编辑器和模块解析器检查，用户也可以沿定义跳转查看插件的真实声明。

```typescript
// config/plugin.ts
import redisPlugin from '@eggjs/redis';
import typeboxPlugin from '@eggjs/typebox-validate';

export default {
  ...redisPlugin(),
  ...typeboxPlugin(),
};
```

## 工厂集中声明元数据并保留覆盖能力

插件作者通过 Egg 的 definePluginFactory 声明 name、enable 和 path，还可以注明 dependencies、optionalDependencies 与 env。Redis 的实际入口将 path 设置为 import.meta.dirname，让插件随自身模块位置提供加载路径。工厂返回以插件名为键的配置对象，并设置 skipMerge，避免加载器再次合并 package.json 的 eggPlugin 字段。

应用可以调用 redisPlugin({ enable: false }) 覆盖启用状态，也能覆盖依赖或环境等元数据；插件 name 由工厂保持固定。实现使用浅层展开，覆盖数组时会替换原数组，不会自动追加。作者应把真正的启动依赖写进声明，应用也应谨慎覆盖 dependencies，避免删掉必要顺序。

工厂模式为新插件提供了明确入口，但旧的 enable 与 package 配置形式仍在兼容配置中使用。迁移可以逐项推进：先升级并核对包的导出，再改成工厂调用，最后检查合并后的配置。尤其要分开理解两类配置：[redisPlugin()](https://github.com/eggjs/egg/blob/a11a6d5046c445307767086cd437f4456af04224/plugins/redis/src/index.ts) 决定插件是否加载，config.redis 中的连接信息才决定插件如何工作。下面是 Redis 的工厂定义节选。

```typescript
import { definePluginFactory } from 'egg';

export default definePluginFactory({
  name: 'redis',
  enable: true,
  path: import.meta.dirname,
});
```

## 用同一份 Schema 连接校验与类型

TypeScript 应用常遇到重复定义问题：HTTP 参数在运行时需要校验，业务函数又需要静态类型。两份定义分开维护时，新增字段或修改可选性很容易只更新一边。[@eggjs/typebox-validate](https://github.com/eggjs/egg/blob/a11a6d5046c445307767086cd437f4456af04224/plugins/typebox-validate/README.md) 用 TypeBox Schema 表达数据结构，再通过 Static 推导 TypeScript 类型，让运行时规则和业务类型引用同一份定义。

启用插件后，ctx.tValidate(schema, data) 调用应用的 Ajv 校验器；失败会抛出状态码 422、code 为 invalid_param 的错误。需要自行处理失败分支时，可以使用返回布尔值的 tValidateWithoutThrow。当前 tValidate 的类型签名也只是 boolean，并非 TypeScript 的 asserts 断言函数，因此未知输入在完成运行时校验后，仍需显式赋予 Schema 推导出的类型。

下面的控制器示例把 Schema 放在类外，避免每次请求重新创建定义。插件当前依赖 typebox 1.x，已从旧的 @sinclair/typebox 包迁移。已有项目若直接导入旧包，需要一起检查包名、Schema API 和自定义格式；示例采用插件提供的 typebox 子路径，它在插件入口中重新导出 typebox 的命名成员。

```typescript
import { Controller } from 'egg';
import { Type, type Static } from '@eggjs/typebox-validate/typebox';

const UserSchema = Type.Object({
  name: Type.String(),
  nickname: Type.Optional(Type.String()),
});

export default class UserController extends Controller {
  async create() {
    const input: unknown = this.ctx.request.body;
    this.ctx.tValidate(UserSchema, input);
    const user = input as Static<typeof UserSchema>;
    this.ctx.body = { name: user.name };
  }
}
```

## Redis 测试可以替换客户端实现

业务单测需要验证缓存读写逻辑时，真实 Redis 服务会增加本地和 CI 的准备成本。@eggjs/redis 允许通过 config.redis.Redis 注入客户端类，因此测试环境可以使用 [ioredis-mock](https://github.com/eggjs/egg/blob/a11a6d5046c445307767086cd437f4456af04224/plugins/redis/README.md#using-ioredis-mock-for-unit-tests)。应用仍通过 app.redis 访问实例，变化集中在测试配置，而不必为了测试修改业务调用方式。

替换客户端时需要配置启动等待行为。插件通常会等待客户端的 ready 或 error 事件，ioredis-mock 可能在构造阶段同步发出 ready，而启动检查注册时该事件已经结束。测试配置必须在 client 中显式设置 weakDependent: true，使该实例不阻塞应用启动。只替换 Redis 类不会自动打开这个选项，插件检查的是客户端 options.weakDependent。

下面的配置来自当前 README 的用法，可放在 config/config.unittest.ts；ioredis-mock 及其类型包应作为测试依赖安装。这个选择适合验证常用命令下的业务行为，连接故障、真实部署配置及客户端与服务端的兼容性仍应由集成测试覆盖。生产环境也不应为了绕过连接失败而照搬 weakDependent，它改变的是应用就绪对 Redis 的依赖程度。

```typescript
import RedisMock from 'ioredis-mock';
import type { EggAppInfo, PartialEggConfig } from 'egg';

export default function (_appInfo: EggAppInfo): PartialEggConfig {
  return {
    redis: {
      Redis: RedisMock,
      client: {
        host: '127.0.0.1',
        port: 6379,
        password: '',
        db: 0,
        weakDependent: true,
      },
    },
  };
}
```

## 安全行为要连同配置一起理解

新迁入的 [@eggjs/cors](https://github.com/eggjs/egg/blob/a11a6d5046c445307767086cd437f4456af04224/plugins/cors/src/app.ts) 展示了官方插件之间的协作方式。应用没有显式配置 cors.origin 时，插件会结合 security 的安全域名检查决定是否返回请求 Origin；若安全检查方法不存在，则保留该 Origin。显式设置 origin 会覆盖这套默认逻辑。因此，升级 CORS 插件时，应结合现有 security 配置测试允许和拒绝的来源，尤其不要把一个宽泛的 origin 设置当成默认白名单的补充。

另一项实际修复发生在 @eggjs/security 的 escapeShellArg：实现修正了 POSIX shell 单引号的转义方式，保持输入作为一个参数。它的适用范围仍然是 POSIX shell 中的单个参数，不负责 Windows cmd 或 PowerShell 的转义。对于需要启动外部程序的应用，插件 README 建议优先使用 execFile 或 spawn 的参数数组，减少自己拼接命令字符串的需要。

这些变化说明，插件升级的检查点不止是 API 能否导入。应用还应验证自身依赖的安全行为，包括自定义 CORS Origin、错误响应和外部命令调用方式。CSRF、XSS 与安全响应头等能力也能与核心一起维护和回归测试，降低跨包修复的验证成本。

## 插件初始化开始兼顾打包与快照

当应用从文件目录部署进一步走向 bundle 或启动快照，插件的隐含假设会显现出来。导入阶段读取模板、动态扫描实现文件，或者在构造器里启动 watcher，都可能妨碍构建。官方插件已经做出具体调整：onerror 与 development 内联默认页面模板，watcher 采用直接类导入，并将 clusterWrapper 与 watch 相关资源的创建移到 configDidLoad。

这对应一条插件作者需要遵守的[生命周期边界](https://github.com/eggjs/egg/blob/a11a6d5046c445307767086cd437f4456af04224/AGENTS.md)。快照构建执行到 configWillLoad，恢复后才从 configDidLoad 继续。构造器和 configWillLoad 应准备可序列化配置与元数据，把套接字、文件监听器、定时器等运行资源留到后续阶段。如果一个插件需要另一个插件创建的运行实例，还要声明依赖，以保证初始化顺序。官方插件完成适配，并不能代替第三方插件检查自己的导入副作用和资源创建位置。

维护已有插件时，可以先核对 Node.js 22.18.0 这一运行基线和 Egg 4 兼容范围，再检查导出、元数据与类型声明。随后用真实应用夹具验证加载、错误与关闭流程，最后根据是否使用打包或快照增加对应检查。测试层若接入当前 Mock 的 Vitest 集成，还需对齐 Vitest ^5.0.1 的要求；这属于测试环境配置，不是线上服务必须安装的运行依赖。

应用开发者可以先从显式依赖的插件入手，保持内置能力的默认配置，逐项迁移可选集成；插件作者则应把加载元数据、类型和资源生命周期一起作为公共接口维护。两类工作在同一仓库中更容易互相验证，也更容易定位升级后究竟是哪一层发生了变化。
