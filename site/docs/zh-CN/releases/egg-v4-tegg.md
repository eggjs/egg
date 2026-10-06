---
title: 'Tegg 模块化'
description: 'Egg 4 的研发体验与生态维护实践：Tegg 模块化'
---

# Tegg 模块化

当一个 Egg 应用有几十个业务模块时，问题往往已经超出文件该放在哪个目录。订单模块能否访问支付实现，请求中的对象何时销毁，测试同时启动两个应用会不会共用状态，这些决定了项目能否继续拆分和演进。Egg 4 对 Tegg 的整合，让模块边界、依赖注入和对象生命周期进入统一的应用模型，也让同一份业务能力有机会服务于 HTTP、MCP 和独立 Worker 宿主。

业务模块可以用同一套对象与生命周期规则参与装配，再通过 HTTP、MCP 或独立 Worker 暴露能力。扩展也可以沿用这些规则接入依赖注入、AOP 和数据访问。

## 成熟的模块能力进入默认应用体验

Tegg 与 Egg 在同一 Monorepo 中维护，基础模块能力由默认插件接入。它延续了 Egg 的加载和生命周期约定，同时为业务类增加可声明的实例化方式、访问级别与依赖关系。原先需要应用自行组装的模块基础设施，现在可以与框架版本一起测试和演进。传统 Controller 和 Service 仍可作为现有应用的起点，团队可以先为边界清楚的新业务采用 Tegg。

默认配置包含九个基础插件：teggConfig、tegg、teggAjv、teggAop、teggController、teggDal、teggEventbus、teggOrm 和 teggSchedule。DISABLE_TEGG_PLUGINS=true 可以整体关闭这一组。默认启用意味着框架准备好了加载、验证、控制器和配套设施，实际业务对象仍由模块内容与配置决定。LangChain、MCP client、MCP proxy 和 DNS cache 要由应用显式接入。

这一分层也帮助团队判断依赖成本。需要发布 MCP 工具时，Server 注册能力已经位于 Controller 插件中；需要从业务调用外部 MCP Server，才涉及客户端能力。DAL 提供模块化的数据访问与表映射，ORM 则是 Leoric 集成，两者有不同的接入方式。升级时应围绕正在使用的功能检查配置，不必为了“用上 Tegg”把所有可选包同时引入。

## 用一个模块表达对象边界和接口

Tegg 以带有 eggModule.name 的 package.json 标识模块。模块里的装饰器类组成可装配的对象图：[ContextProto](https://github.com/eggjs/egg/blob/a11a6d5046c445307767086cd437f4456af04224/tegg/README.md) 表示每个上下文一个实例，SingletonProto 表示应用生命周期内的单例，MultiInstanceProto 则允许同一类对应多个实例。服务默认只有模块内可见性；确有跨模块调用需求时，再用 AccessLevel.PUBLIC 明确公开边界。

下面把一个问候服务与 [HTTP Controller](https://github.com/eggjs/egg/blob/a11a6d5046c445307767086cd437f4456af04224/examples/helloworld-service-worker/app/HelloController.ts) 放进同一模块。三个片段依次是模块目录的 package.json、HelloService.ts 和 HelloController.ts；应用外层仍需正常的 Egg 或独立宿主配置。相关装饰器从 @eggjs/tegg 导入。

```json
{
  "name": "greeting-module",
  "type": "module",
  "eggModule": { "name": "greeting" }
}
```

```typescript
import { ContextProto } from '@eggjs/tegg';

@ContextProto()
export class HelloService {
  hello(name: string): string {
    return `hello, ${name}`;
  }
}
```

```typescript
import { HTTPController, HTTPMethod, HTTPMethodEnum, HTTPQuery, Inject } from '@eggjs/tegg';
import { HelloService } from './HelloService.ts';

@HTTPController({ path: '/hello' })
export class HelloController {
  @Inject()
  private readonly helloService: HelloService;

  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/' })
  async hello(@HTTPQuery({ name: 'name' }) name: string) {
    return { message: this.helloService.hello(name ?? 'Egg') };
  }
}
```

Inject 声明由容器提供 helloService，HTTPController 和 HTTPMethod 则声明接口元数据。请求进入后，框架在当前上下文解析服务对象，业务方法只处理参数和返回值。随着服务依赖增加，可以继续使用构造器注入、可选注入和 Qualifier 选择实现，而不必把查找逻辑散落在方法里。

作用域选择需要服从状态的实际寿命。保存本次请求数据的对象适合上下文作用域，跨请求复用的无请求状态组件才适合单例。单例中的可变字段会被多个请求共享，装饰器不会自动消除并发读写问题。模块的价值在于让这些选择可以被审查，并让依赖关系进入框架可检查的图。

拆分模块时，可以把支付渠道适配器保持为模块私有，只公开完成支付所需的应用服务。这样，上游只依赖稳定的业务接口，渠道实现可以在模块内替换。若多个实现具有同类职责，再使用限定条件表达选择规则。公开对象越少，模块间的依赖越容易在评审和测试中看清；把所有类设为公开，反而会削弱模块边界。

## 扩展能力参与同一套装配顺序

对框架作者而言，业务对象能被注入只是第一步。AOP 需要在对象生成前织入，数据访问需要在依赖图建立前提供基础对象，销毁阶段又必须让清理逻辑有机会访问尚未释放的资源。过去这些工作容易变成宿主启动文件中的手工接线，换一个宿主便要重新维护一遍。

声明式 Module Plugin 让普通 eggModule 可以通过 InnerObjectProto 声明内部对象，并通过 EggLifecycleProto 声明可注入的生命周期处理器。处理器覆盖 LoadUnit、LoadUnitInstance、EggPrototype、EggObject 和 EggContext 五类对象，因此扩展可以与业务模块一起被发现、装配和销毁。

这里最重要的是顺序。框架先扫描业务图节点，再实例化内部对象并注册生命周期 hook，随后构建、排序业务图和创建业务对象。销毁时，内部 hook 对象最后释放。图构建开始后再注册 hook 或重复构建，会直接失败，避免扩展看似已注册、实际没有参与早期装配。对 AOP 和 Controller middleware 的相关修复，也都在收紧这条生命周期边界。

多应用隔离补齐了另一条边界。框架使用 AsyncLocalStorage 承载每个应用的 scope bag，把主要工厂、依赖图、单例管理器、生命周期及控制器状态放回各自应用。并行测试或同进程嵌入多个应用因而更容易保持隔离。扩展自己创建的全局 Map 仍由扩展负责；timer、emitter 或脱离请求链的调用，也要保留正确应用 scope。多应用场景下丢失 scope，开发环境会抛错，生产环境会告警。

大型依赖图也得到相应优化。实现用访问状态避免重复遍历共享子图，并为原型查找建立名字索引，减少装配时无意义的重复工作。它们改善的是特定图构建步骤，应用最终启动时间仍取决于模块数量、对象初始化和外部资源连接。扩展作者更适合用自己的模块结构测量，而不是直接套用微基准倍率。

## MCP 与 Agent 复用模块模型

HTTP 接口只是对象图的一种入口。[MCPController](https://github.com/eggjs/egg/blob/a11a6d5046c445307767086cd437f4456af04224/examples/helloworld-service-worker/app/CalcMCPController.ts) 可以把模块方法注册为 Tool、Prompt 或 Resource，仍然使用同一套依赖注入和生命周期。下面的工具返回一个问候文本，HelloService 沿用前面的类。装饰器从 @eggjs/tegg 导入，方法返回 MCP 的 content 结构。实际部署还需要按宿主选择传输方式与访问控制。

```typescript
import { Inject, MCPController, MCPTool } from '@eggjs/tegg';
import { HelloService } from './HelloService.ts';

@MCPController({ name: 'greeting' })
export class GreetingMCPController {
  @Inject()
  private readonly helloService: HelloService;

  @MCPTool({ description: 'Return a greeting' })
  async hello() {
    return { content: [{ type: 'text' as const, text: this.helloService.hello('MCP') }] };
  }
}
```

这对已有业务系统很实用：HTTP Controller 与 MCP Controller 可以调用同一个领域服务，权限校验与数据访问也可以放在共享层。工具描述、参数 schema 和结果封装则留在协议边界。工具调用具有外部输入，依然需要认证、授权、参数校验与执行限额；拥有 MCP 注册能力不会替应用完成这些业务安全决策。

Agent 服务进一步提供 thread、run、取消和流式响应的运行模型。AgentController 组织相关路由，[AgentRuntime](https://github.com/eggjs/egg/blob/a11a6d5046c445307767086cd437f4456af04224/tegg/core/agent-runtime/src/AgentRuntime.ts) 支持同步、异步和 SSE 模式，并允许按 lastSeq 重放流事件。应用仍要提供 createStore() 和 execRun()，决定状态如何存储、模型或工作流如何执行。可选 LangChain 插件把图、节点、边与模型绑定接入模块系统，模型凭据、存储和运行策略仍属于应用配置。

AgentRuntime 的活动任务保存在进程 Map 中，流事件使用本地 JSONL 文件；这些机制支持本地运行与重连所需的状态管理，跨节点接管与分布式任务调度需要另外配置基础设施。采用早期预发布 Agent API 的项目，需要将消息类型迁移到 AgentMessage。

## 独立 Worker 把宿主差异留在边界

独立运行与 Agent API 处于预发布阶段，接入时需选择兼容的包版本。

当控制器注册逻辑与 Egg 宿主解耦后，同一套模块模型可以获得更轻的运行入口。host-neutral 的 controller-runtime 与 @eggjs/service-worker 提供了独立宿主入口。[ServiceWorkerApp](https://github.com/eggjs/egg/blob/a11a6d5046c445307767086cd437f4456af04224/tegg/standalone/service-worker/README.md) 能在 Node 中 serve，也能接受 Fetch Request 并返回 Response；它不需要启动完整 Egg Application。

独立宿主保留了请求参数映射、依赖注入和请求对象生命周期，流式响应结束前会保留相应上下文。HTTP 返回值可以是 Response、字符串、二进制、流或 JSON。宿主通过 innerObjectHandlers 提供认证、HTTP 客户端和错误映射等设施，使领域服务与运行环境之间的依赖更明确。

迁移到这条路径时，要逐项核对实际使用的宿主能力。例如 Fetch transport 的 Cookie 只支持无签名读写；默认 MCP 为 stateless Streamable HTTP，每次请求创建新的 server 和 transport，GET 与 DELETE 返回 405。Cloudflare 示例采用 module worker、预先构建和 nodejs_compat。它为适合 Fetch 模型的服务增加了部署选择，依赖完整 Egg 插件行为的应用仍需评估和适配。

## 按现有使用面安排迁移

应用团队可以先选一个独立业务模块，明确公开服务、对象作用域和入口协议，再补充对象创建、并行请求与销毁测试。模块之间通过少量公开接口协作，比先搬动所有目录更容易验证收益。已有传统应用也应保留回归测试，确认默认插件接入没有与自定义加载逻辑冲突。

测试也应覆盖模块边界本身。可以为同一服务经 HTTP 和 MCP 调用分别保留用例，确认协议层没有改变业务语义；并发请求中检查上下文状态是否独立；同进程创建两个应用后分别关闭，检查一个应用的清理是否影响另一个。涉及后台工作或流响应时，还要观察请求结束与对象销毁的先后关系。

框架扩展作者则要检查几个具体变化。旧 standalone Runner 应用类已经由 StandaloneApp 替代，但 @Runner() 装饰器仍保留。main() 的 options.innerObjects 改为 innerObjectHandlers，logger 使用专用选项；config、moduleConfig 等框架持有对象不能被普通 handlers 覆盖。DAL 删除了 app.mysqlDataSourceManager 与相关 ./app 导出，应改为注入 MysqlDataSourceManager，或在正确应用 scope 中解析对象。

包名也需要按依赖清单逐一核对，例如 @eggjs/tegg-aop-plugin 已变为 @eggjs/aop-plugin，插件配置名统一为 teggAop 等当前名称。完成这些迁移后，再考虑跨宿主复用和 AI 服务入口，问题会更容易定位。模块化改造的验收点应是边界明确、装配顺序正确以及资源能可靠释放。
