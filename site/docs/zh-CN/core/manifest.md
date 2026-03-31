# 启动清单（Startup Manifest）

Egg 提供了启动清单（Manifest）机制，通过缓存文件发现和模块解析结果来加速应用的冷启动。

## 原理

应用每次启动时，框架需要执行大量文件系统操作：

- **模块解析**：数百次 `fs.existsSync` 调用，探测 `.ts`、`.js`、`.mjs` 等后缀
- **文件发现**：多次 `globby.sync` 扫描插件、配置、扩展等目录
- **tegg 模块扫描**：遍历模块目录，`import()` 装饰器文件收集元数据

Manifest 机制在首次启动时收集这些结果，写入 `.egg/manifest.json`。后续启动直接读取缓存，跳过重复的文件 I/O。

## 性能提升

在容器冷启动场景下（无文件系统缓存），以 cnpmcore 项目实测：

| 指标        | 无 Manifest | 有 Manifest | 提升     |
| ----------- | ----------- | ----------- | -------- |
| 应用启动    | ~980ms      | ~780ms      | **~20%** |
| 文件加载    | ~660ms      | ~490ms      | **~26%** |
| 加载 app.js | ~280ms      | ~150ms      | **~46%** |

> 注意：在本地开发环境中，操作系统的页面缓存（page cache）会使文件 I/O 接近零开销，因此提升不明显。Manifest 主要优化的是容器冷启动、CI/CD 等无缓存场景。

## 使用方式

### 通过 CLI 管理（推荐）

`egg-bin` 提供了 `manifest` 命令来管理启动清单：

#### 生成清单

```bash
# 为生产环境生成
$ egg-bin manifest generate --env=prod

# 指定环境和作用域
$ egg-bin manifest generate --env=prod --scope=aliyun

# 指定框架
$ egg-bin manifest generate --env=prod --framework=yadan
```

生成过程会以 `metadataOnly` 模式启动应用（跳过生命周期钩子，只收集元数据），然后将结果写入 `.egg/manifest.json`。

#### 验证清单

```bash
$ egg-bin manifest validate --env=prod
```

输出示例：

```
[manifest] Manifest is valid
[manifest]   version: 1
[manifest]   generatedAt: 2026-03-29T12:13:18.039Z
[manifest]   serverEnv: prod
[manifest]   serverScope:
[manifest]   resolveCache entries: 416
[manifest]   fileDiscovery entries: 31
[manifest]   extension entries: 1
```

如果清单无效或不存在，命令将以非零退出码退出。

#### 清理清单

```bash
$ egg-bin manifest clean
```

### 自动生成

应用正常启动后，框架会在 `ready` 阶段自动生成清单（通过 `dumpManifest`）。下次启动时如果清单有效，则自动使用。

## 清单失效机制

清单包含指纹信息，以下情况会自动失效：

- **锁文件变更**：`pnpm-lock.yaml`、`package-lock.json` 或 `yarn.lock` 的修改时间或大小变化
- **配置目录变更**：`config/` 目录下的文件发生变化（基于 MD5 指纹）
- **环境不匹配**：`serverEnv`、`serverScope` 与清单中记录的不一致
- **TypeScript 状态变更**：`EGG_TYPESCRIPT` 启用/禁用状态发生变化
- **版本不匹配**：清单格式版本号不一致

清单失效时，框架会回退到正常的文件发现流程，不会影响启动。

## 环境变量

| 变量           | 说明               | 默认值                            |
| -------------- | ------------------ | --------------------------------- |
| `EGG_MANIFEST` | 在本地环境启用清单 | `false`（本地环境默认不加载清单） |

> 本地开发环境（`serverEnv=local`）默认不加载清单，因为开发时文件频繁变更，清单容易失效。设置 `EGG_MANIFEST=true` 可强制启用。

## 部署建议

### 容器化部署

在 Dockerfile 中，构建完成后生成清单：

```dockerfile
# 安装依赖并构建
RUN npm install --production
RUN npm run build

# 生成启动清单
RUN npx egg-bin manifest generate --env=prod

# 启动应用（将自动使用清单）
CMD ["npm", "start"]
```

### CI/CD 流水线

在构建阶段生成清单，随制品一起部署：

```bash
# 构建
npm run build

# 生成清单
npx egg-bin manifest generate --env=prod

# 验证清单
npx egg-bin manifest validate --env=prod

# 打包（包含 .egg/manifest.json）
tar -zcvf release.tgz .
```

## 注意事项

1. **清单与环境绑定**：清单绑定了 `serverEnv` 和 `serverScope`（部署类型，如 `aliyun`），不同环境或部署类型需要分别生成
2. **依赖变更后需重新生成**：安装或更新依赖后，锁文件变更会自动使清单失效
3. **`.egg` 目录**：清单存储在 `.egg/manifest.json`，建议将 `.egg/` 加入 `.gitignore`
4. **回退安全**：清单缺失或无效时，框架会自动回退到正常流程，不会导致启动失败
5. **metadataOnly 模式**：`manifest generate` 不会启动完整的应用生命周期，不会连接数据库或外部服务

## 清单结构

```json
{
  "version": 1,
  "generatedAt": "2026-03-29T12:13:18.039Z",
  "invalidation": {
    "lockfileFingerprint": "pnpm-lock.yaml:1711234567890:12345",
    "configFingerprint": "a1b2c3d4e5f6...",
    "serverEnv": "prod",
    "serverScope": "",
    "typescriptEnabled": true
  },
  "extensions": {
    "tegg": { ... }
  },
  "resolveCache": {
    "config/plugin": "config/plugin.ts",
    "config/plugin.default": null
  },
  "fileDiscovery": {
    "app/middleware": ["trace.ts", "auth.ts"]
  }
}
```
