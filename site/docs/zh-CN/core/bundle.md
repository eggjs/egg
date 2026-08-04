# 打包部署

Egg 可以通过 [`@eggjs/egg-bundler`](https://github.com/eggjs/egg/tree/next/tools/egg-bundler)
将应用打包成一个自包含、可部署的 CommonJS 产物，由 `egg-bin bundle` 命令驱动。打包会把应用代码、框架、插件以及依赖内联进自包含的 worker 文件——适用于加速冷启动、缩小部署镜像，以及 Serverless 场景。它既可以生成单进程 worker，也可以为 Egg cluster 模式分别生成 app 和 agent worker。

打包构建在[启动清单](./manifest.md)之上：打包器复用清单中的文件发现、模块解析以及 tegg 模块元数据，使打包后的应用在运行时跳过文件系统扫描。

## 构建

```bash
$ egg-bin bundle
```

默认产物输出到 `./dist-bundle`。常用参数：

| 参数                | 说明                                                 |
| ------------------- | ---------------------------------------------------- |
| `--output <dir>`    | 输出目录，默认 `./dist-bundle`。                     |
| `--mode <mode>`     | `production`（默认）或 `development`。               |
| `--framework <pkg>` | 框架包名，默认 `egg`（或读取 `pkg.egg.framework`）。 |
| `--cluster`         | 分别生成 `app_worker.js` 和 `agent_worker.js`。      |
| `--force-external`  | 始终保持为 external 的包名（可重复）。               |
| `--inline-external` | 即使被自动识别为 external 也强制内联的包名。         |

大多数应用无需任何 `--force-external`：打包器会自动识别必须保持 external 的包（原生
addon、可选平台包、带原生绑定的包、无法解析的可选 peer 依赖），并内联其余所有内容，
包括 `egg` 和 `@eggjs/*`。

如果 `<baseDir>/.egg/manifest.json` 不存在，打包器会先以 `metadataOnly: true` 启动应用来生成它（仅运行 `loadMetadata()` 钩子，不启动 agent 和正常生命周期即退出）。

### 通过 `module.yml` 配置

应用可以在 `<baseDir>/module.yml` 中声明稳定的打包配置：

```yaml
bundle:
  runtimeAssets:
    # 扫描运行时资源的目录（默认：app）。
    roots:
      - app
    # 即使是源码类文件也原样拷贝的目录（默认：app/public、app/assets、app/static）。
    forceCopyDirs:
      - app/public
      - app/assets
      - app/static
  pack:
    resolve:
      alias:
        some-package: ./node_modules/some-package/index.js
```

`roots` 和 `forceCopyDirs` 一旦显式配置就会分别替换对应的默认值，而不是追加到默认值。
因此扩展扫描或强制拷贝目录时，应同时保留应用仍然需要的默认目录。

### 使用 Leoric migrate 时拷贝 migration 文件

这是一个可选配置。普通 ORM 模型加载和查询不需要复制 migration 文件；如果应用会在
bundle 运行环境中调用 Leoric 的 `migrate` 或 `rollback`，Leoric 会在运行时扫描
`migrations` 目录并加载其中的 migration 模块。这类文件不会仅因应用代码进入 bundle
而自动包含在产物中，此时需要把 migration 目录声明为运行时资源：

```yaml
# module.yml
bundle:
  runtimeAssets:
    roots:
      - app
      - database
    forceCopyDirs:
      - app/public
      - app/assets
      - app/static
      - database
```

相对路径还应基于 `appInfo.baseDir` 转换为绝对路径。源码模式下 `appInfo.baseDir` 是应用
目录；bundle 模式下则是 bundle 输出目录，因此两种模式会分别读取各自产物中的
`database` 目录，而不会意外依赖构建时的源码目录：

```ts
// config/config.default.ts
import path from 'node:path';

export default (appInfo: { baseDir: string }) => ({
  orm: {
    migrations: path.join(appInfo.baseDir, 'database'),
  },
});
```

使用 `orm.datasources` 时，应对每个配置了 `migrations` 的数据源采用相同的路径处理。
这套方式复用既有的运行时资源拷贝能力，无需修改 Egg 或 Leoric。

## 产物

默认的单进程构建会生成一个自包含 worker 文件：

```
dist-bundle/
├── worker.js            # 自包含的单进程入口
├── app/...              # 拷贝的运行时资源（如果存在）
├── package.json         # { "type": "commonjs" }
└── bundle-manifest.json # 参考元数据（externals、entries 等）
```

使用 `--cluster` 时，worker 入口会按角色拆分：

```
dist-bundle/
├── app_worker.js        # 应用 worker 入口
├── agent_worker.js      # agent worker 入口
├── app/...              # 拷贝的运行时资源（如果存在）
├── package.json         # { "type": "commonjs" }
└── bundle-manifest.json # 参考元数据（externals、entries 等）
```

完整细节见[产物结构参考](https://github.com/eggjs/egg/blob/next/tools/egg-bundler/docs/output-structure.md)。

## 运行

被识别为 **external** 的包不会被内联，必须与产物一起安装。最简单的方式是把应用的
`dist-bundle` 保留在应用或部署根目录下，并在根目录安装生产依赖，使 Node 可以从 bundle
输出目录向上解析这些依赖：

```bash
$ npm ci --omit=dev
$ node ./dist-bundle/worker.js
```

不要覆盖生成的 `dist-bundle/package.json`：其中的 `{ "type": "commonjs" }` 会确保 Node
把生成的 `.js` worker 按 CommonJS 解析，即使应用本身使用 ESM。

单进程 worker 入口会装载 bundle 的清单存储和模块加载器，然后以 `mode: 'single'` 启动
Egg，并将 `baseDir` 设为输出目录，因此 agent 与 worker 在同一进程内运行。

cluster 模式通过 `egg-scripts` 启动两个角色入口：

```bash
$ egg-bin bundle --cluster
$ egg-scripts start --bundle --bundle-dir ./dist-bundle
```

`--bundle-dir` 默认是 `./dist-bundle`。高级启动场景可以通过 `--app-worker-file` 和
`--agent-worker-file` 分别覆盖生成的入口。普通 cluster bundle 同时支持 process 和
`worker_threads` 启动模式。V8 启动 blob 的用法见 [V8 启动快照](../advanced/snapshot.md)。

## 限制

- **原生 addon** 始终保持 external，必须在部署目标上预先存在。
- **External 包** 必须能从 bundle 输出目录解析到（见[运行](#运行)）。
- **Cluster 启动模块**：bundle cluster worker 不支持通过 `options.require` 注入启动模块；
  启动器会在创建 worker 前直接报错，而不是静默忽略。
