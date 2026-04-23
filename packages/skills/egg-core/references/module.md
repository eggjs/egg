# module 开发指南

## 创建 module

在 `app` 目录中，创建 module 目录，并在该目录中添加 `package.json`。

```json
{
  "name": "moduleName",
  "eggModule": {
    "name": "moduleName"
  }
}
```

**重要提示**：

- 模块名称不能包含 `-` 或其他特殊字符；使用驼峰命名规则。
- module 的 `package.json` 文件中，仅包含 `name` 以及 `eggModule.name` 字段，不应该有其他额外内容。

## module 发现机制

框架支持两种模式：自动扫描（默认）和手动声明。两者互斥，当 `config/module.json` 存在时，自动扫描完全禁用。

### 模式一：自动扫描（默认）

当 `config/module.json` **不存在**时，框架通过以下两种方式发现模块：

**1. 目录扫描**

从项目根目录开始扫描，查找含有 `eggModule.name` 的 `package.json`。

- 默认扫描深度：10 层
- 自动排除：隐藏目录（`.` 开头）、`node_modules/`、`coverage/`

可通过应用配置调整扫描深度和排除路径：

```typescript
// config/config.default.ts
export default {
  tegg: {
    readModuleOptions: {
      deep: 5, // 默认 10
      extraFilePattern: ['!**/dist'], // 额外排除 dist 目录
    },
  },
};
```

`extraFilePattern` 使用 [globby](https://github.com/sindresorhus/globby) 语法，以 `!` 开头表示排除。

```
app/
├── fooModule/          ✅ 被扫描到
│   └── package.json    { "eggModule": { "name": "fooModule" } }
├── barModule/          ✅ 被扫描到
│   └── package.json    { "eggModule": { "name": "barModule" } }
├── .hidden/            ❌ 隐藏目录，自动排除
│   └── package.json
└── common/             ❌ 无 package.json，不会加载
    └── utils.ts
```

**2. npm 包扫描**

框架会遍历项目 `package.json` 中 `dependencies` 的每个包（不含 `devDependencies`），检查其 `package.json` 是否含有 `eggModule.name`，如果有则自动作为模块加载。

### 模式二：手动声明

创建 `config/module.json` 后，自动扫描**完全禁用**，仅加载文件中声明的模块：

```json
[
  { "path": "../app/module-a" }, // 相对于 config 目录的路径
  { "package": "@eggjs/common-module" } // npm 包名
]
```

## module 配置

在模块根目录创建 `module.yml` 存放模块专属配置：

```
app/
└── userModule/
    ├── package.json
    ├── module.yml          # 基础配置
    ├── module.unittest.yml # 环境特定配置（可选）
    └── UserService.ts
```

### 配置文件格式

支持 YAML 和 JSON 两种格式，优先加载 YAML：

```yaml
# module.yml
features:
  dynamic:
    foo: bar
```

### 环境配置合并

框架会按 `module.yml` → `module.{env}.yml` 的顺序深度合并：

```yaml
# module.yml
features:
  dynamic:
    foo: bar

# module.unittest.yml
features:
  dynamic:
    testMode: true
```

unittest 环境下合并结果：

```json
{
  "features": {
    "dynamic": {
      "foo": "bar",
      "testMode": true
    }
  }
}
```

### 注入配置

通过 `@Inject()` 注入 `moduleConfig`，框架自动注入当前模块的配置：

```typescript
import { SingletonProto, Inject } from 'egg';

interface ModuleConfig {
  features: {
    dynamic: {
      foo: string;
    };
  };
}

@SingletonProto()
export class UserService {
  @Inject()
  moduleConfig: ModuleConfig;

  async getFeatureFlag(): Promise<string> {
    return this.moduleConfig.features.dynamic.foo; // 'bar'
  }
}
```

## module 目录组织

### 新应用

直接在 `app/` 目录下平铺 module。可按功能划分，也可按业务划分：

**按功能划分：**

```
app/
├── authModule/
│   └── package.json
├── logModule/
│   └── package.json
└── storageModule/
    └── package.json
```

**按业务划分：**

```
app/
├── userModule/
│   └── package.json
├── orderModule/
│   └── package.json
└── paymentModule/
    └── package.json
```

### 存量应用（包含老的 egg 写法）

保留原有 `app/controller`、`app/service` 等目录不动，将新增的 module 统一放在 `app/module/` 下：

```
app/
├── controller/           # 老的 egg 代码，保持不变
├── service/
├── module/               # 新增 module 统一放这里
│   ├── userModule/
│   │   └── package.json
│   └── orderModule/
│       └── package.json
└── router.ts
```
