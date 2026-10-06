---
title: 'TypeScript 与 ESM'
description: 'Egg 4 的研发体验与生态维护实践：TypeScript 与 ESM'
---

# TypeScript 与 ESM

Egg 4 的 TypeScript 重构，让类型从应用侧的补充说明进入框架实现、配置 API 和插件入口。应用作者可以继续沿用 Controller、Service、配置与生命周期约定，同时在编辑器中更早发现接口不匹配；贡献者也能在跨包修改时用同一套类型约束检查影响范围。

ESM 发布、类型化配置工厂、文件加载和开发期转译共同组成应用的开发流程。使用时需要协调三个层面：应用采用哪种模块格式，开发时如何执行 TypeScript，以及生产环境最终加载什么产物。

## 框架使用 ESM 后应用怎样选择模块格式

egg 包声明 type: module，发布导出指向 dist 下的 JavaScript；仓库内的 exports 则指向 src 下的 TypeScript，并通过 publishConfig 配置发布入口。这种布局便于工作区开发直接引用源码，又让包使用者消费构建产物。阅读源码 package.json 时，要把开发入口和发布入口一起看，避免把 src/index.ts 当成用户安装后必然执行的文件。

应用仍有 [CommonJS 和 ESM](https://github.com/eggjs/egg/blob/a11a6d5046c445307767086cd437f4456af04224/examples/helloworld-commonjs/package.json) 两条路径。仓库保留 type: commonjs 的完整示例，同时新的 TypeScript 模板使用 type: module 与 NodeNext。Node.js 运行基线为 22.18.0，为现代模块互操作提供运行前提；但第三方依赖的导出形式、默认导入和初始化行为仍需逐项验证。保留 CommonJS 的团队可以先升级运行环境和官方依赖，再按模块逐步迁移，不必把业务重写与框架升级绑在同一次变更中。

选择 ESM 后，应同步审查 package.json、编译器模块设置、相对导入扩展名，以及原先依赖 require、\_\_dirname 的代码。应用自己的模块边界保持一致，比把文件后缀全部替换更重要。若正在维护可复用插件，还要验证包根入口和已公开的子路径，让消费方升级时拥有明确的导入契约。

## 用类型化配置缩短反馈链路

配置文件往往是应用最容易出现拼写错误和嵌套字段类型错误的地方。[defineConfig](https://github.com/eggjs/egg/blob/a11a6d5046c445307767086cd437f4456af04224/packages/egg/src/lib/define.ts#L7-L45) 接收 PartialEggConfig，也就是 EggAppConfig 的深层可选形态，允许只填写需要覆盖的部分。以下写法设置日志级别与 HTTP 客户端的默认请求超时，编辑器会据此提供补全和类型检查：

```typescript
// config/config.default.ts
import { defineConfig } from 'egg';

export default defineConfig({
  logger: { level: 'INFO', consoleLevel: 'WARN' },
  httpclient: { request: { timeout: 5000 } },
});
```

需要依赖应用名、目录或环境信息时，使用 defineConfigFactory。它接收以 EggAppInfo 为参数的工厂函数，返回这个函数供框架调用。下例根据当前环境设置日志级别，保留了应用原有的配置计算方式：

```typescript
import { defineConfigFactory } from 'egg';

export default defineConfigFactory((appInfo) => ({
  logger: {
    level: appInfo.env === 'local' ? 'DEBUG' : 'INFO',
    consoleLevel: 'WARN',
  },
}));
```

两个 helper 的实现都很轻：分别原样返回配置对象或工厂函数。因此，defineConfig 用于对象，defineConfigFactory 用于函数；它们提供编写阶段的类型边界，不会自动校验环境变量、远程配置或运行时输入。来自外部的数据仍应在进入配置前显式解析和校验。

应用自定义字段也需要稳定的类型约定。团队可以继续通过模块声明扩展描述服务、上下文和业务配置，避免为了通过编译在全局添加宽泛的 any。类型越接近真实契约，重命名和跨模块重构的反馈就越可靠。

## 插件工厂让入口与元数据集中表达

[definePluginFactory](https://github.com/eggjs/egg/blob/a11a6d5046c445307767086cd437f4456af04224/packages/egg/src/lib/define.ts#L47-L103) 将插件的名称、启用状态、路径和依赖关系集中到可导入的入口。以当前 Redis 插件为例，应用在 config/plugin.ts 中可以这样声明：

```typescript
import redisPlugin from '@eggjs/redis';

export default {
  ...redisPlugin({ env: ['local', 'unittest'] }),
};
```

插件作者通过 definePluginFactory 提供 name、enable、path，以及可选的 dependencies、optionalDependencies 和 env。官方插件常用 import.meta.dirname 指定自身目录。工厂返回以插件名为键的配置记录，调用方选项通过浅合并覆盖元数据，但名称保持由插件确定；同时标记 skipMerge，避免再合并 package.json 中的 eggPlugin 字段。

这使编辑器能够从 import 跟到入口，减少应用里分散的包名字符串，也便于插件重构时维护元数据。传统 enable 与 package 配置仍在兼容配置中保留，已有项目可以逐个替换。迁移时需特别检查环境限制和依赖声明，确认新工厂表达的启用范围与原来一致。

## 模块后缀和编译目录如何参与加载

Egg 的约定式目录加载已把 .mjs 与 .cjs 纳入默认匹配；开启 TypeScript 支持时，还会加载 .ts 并排除 .d.ts。同目录存在同名 TypeScript 源文件与 .js、.mjs 或 .cjs 产物时，FileLoader 优先采用候选列表中的 .ts，避免同一属性被加载两次。这让开发期与编译产物共存更稳健，但保持构建目录清晰仍能减少排查成本。

针对编译输出目录，[EggLoader.resolveModule](https://github.com/eggjs/egg/blob/a11a6d5046c445307767086cd437f4456af04224/packages/core/src/loader/egg_loader.ts#L1818-L1869) 增加了找不到原路径后的回退。它先读取 package.json 的 egg.outDir，未设置时再尝试 tsconfig.json 中直接声明的 compilerOptions.outDir。下面是应用配置：

```json
{
  "egg": {
    "outDir": "dist"
  }
}
```

例如应用根目录下的 config/config.default 无法直接解析时，可继续尝试 dist/config/config.default.js 与 .mjs。这个行为是解析失败后的补充，并且仅针对应用 baseDir 范围内的路径；回退候选没有 .cjs。它也不会代替编译步骤，更不等于把所有目录扫描自动切换到 dist。

自动读取 tsconfig 的实现使用 JSON.parse，因而不要依赖它处理注释、继承链或完整的 TypeScript 配置解析。配置较复杂的项目可以显式设置 egg.outDir，并在部署包中验证目录布局、启动入口和插件文件。回退机制便于过渡，清晰的产物结构才是长期可靠的部署契约。

## 开发期快速转译与类型检查分开执行

egg-bin 的默认 TypeScript 加载器是 @oxc-node/core/register。一个 --import 入口同时注册 CommonJS 与 ESM 的 TypeScript 加载能力；隐式默认从 CLI 自身依赖位置解析，避免应用中的旧版 oxc 遮蔽工具携带的版本。显式 --tscompiler 仍保留选择其他编译器的路径，tsconfig-paths/register 也继续参与路径别名支持。

快速转译使开发启动更轻，但应用能启动并不能证明类型检查通过。可以继续用 egg-bin dev 运行开发服务，再把独立的无输出类型检查加入 CI。下面的 scripts 片段使用模板已有的 TypeScript 编译器依赖，适合希望采用 tsc 检查的应用：

```typescript
"scripts": {
  "dev": "egg-bin dev",
  "typecheck": "tsc --noEmit",
  "build": "tsc"
}
```

生产流程也应保持显式构建。当前生产启动工具不会因为 egg.typescript 就自动接入开发转译器，这个字段主要参与 source map 设置。发布前先生成 JavaScript，再用实际产物演练启动，能够提前发现源码环境有依赖、部署包却缺少文件的问题。不要用本地开发成功代替生产启动验证。

框架仓库大量使用 tsgo --noEmit，并配置 @typescript/native-preview；工作区使用的 TypeScript 仍为 5.9 系列。native-preview 属于预览工具链，应用团队可以独立评估其兼容性。[@eggjs/tsconfig](https://github.com/eggjs/egg/blob/a11a6d5046c445307767086cd437f4456af04224/packages/tsconfig/tsconfig.json) 的公共默认配置采用 NodeNext，并保留装饰器相关设置；isolatedDeclarations 与 verbatimModuleSyntax 默认为 false，而仓库根配置有面向库维护的更严格覆盖。应用无需照搬根配置的每个选项。

## 共享类型包与应用声明各负其责

[@eggjs/typings](https://github.com/eggjs/egg/blob/a11a6d5046c445307767086cd437f4456af04224/packages/typings/src/index.ts) 把多个底层包共同依赖的契约抽成独立包。包含 BundleModuleLoader、ModuleImporter 以及相关全局声明，服务于工具与框架之间的加载协作。比如测试运行器需要接管模块导入时，共用一份契约有助于减少重复声明和跨包耦合。它更接近基础设施的接口层，普通 Controller、Context 和应用配置类型仍可从 egg 的公开入口获取。

升级时也要留意自动类型生成流程。egg-bin 已移除 egg-ts-helper 集成，--declarations 与 --dts 虽然仍被接受，但已标为废弃且没有效果。原来依赖这些参数生成的服务或控制器声明，应明确由哪个工具或维护流程负责，再检查 CI 是否真实执行。仅保留旧命令文本，会让声明停留在过期状态而难以及时察觉。

一次完整迁移可以从最小模块开始：确认运行环境和模块格式，转换一个配置文件，校验一组插件入口，再分别运行类型检查、开发测试和构建产物启动。出现问题时沿着“类型契约、模块解析、产物路径”逐层定位，比同时更换编译器、目录布局和业务架构更容易回退。
