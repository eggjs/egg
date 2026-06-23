# 打包部署

Egg 可以通过 [`@eggjs/egg-bundler`](https://github.com/eggjs/egg/tree/next/tools/egg-bundler)
将应用打包成一个自包含、可部署的 CommonJS 产物，由 `egg-bin bundle` 命令驱动。打包会把应用代码、框架、插件以及依赖内联进少量 chunk，并以 Egg 的单进程模式启动——适用于加速冷启动、缩小部署镜像，以及 Serverless 场景。

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
  pack:
    resolve:
      alias:
        some-package: ./node_modules/some-package/index.js
```

## 产物

```
dist-bundle/
├── worker.js                 # 打包器生成的 worker 入口
├── _root-of-the-server__*.js # @utoo/pack 模块图 chunk（文件名不透明）
├── _turbopack__runtime.js    # @utoo/pack 运行时垫片
├── app/...                   # 拷贝的运行时资源（html/静态资源等）
├── tsconfig.json             # 供 SWC 编译器读取
├── package.json              # { "type": "commonjs" }
└── bundle-manifest.json      # 参考元数据（externals、chunks 等）
```

完整细节见[产物结构参考](https://github.com/eggjs/egg/blob/next/tools/egg-bundler/docs/output-structure.md)。

## 运行

被识别为 **external** 的包不会被内联，必须与产物一起安装。最简单的方式是把应用的
`package.json` 拷贝到 `worker.js` 旁边，并安装生产依赖：

```bash
$ cd dist-bundle
$ cp ../package.json .
$ npm ci --omit=dev
$ node worker.js
```

worker 入口会装载 bundle 的清单存储和模块加载器，然后以 `mode: 'single'` 启动 Egg，
并将 `baseDir` 设为输出目录，因此 agent 与 worker 在同一进程内运行。

## 限制

- **仅单进程**：bundle 以 `mode: 'single'` 运行，agent 与 worker 同进程。暂不支持
  集群模式打包。
- **原生 addon** 始终保持 external，必须在部署目标上预先存在。
- **External 包** 必须安装在 `worker.js` 旁边（见[运行](#运行)）。
