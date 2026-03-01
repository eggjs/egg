# Redis

[Redis](https://redis.io/) 是一个高性能的内存数据存储，广泛用于缓存、会话管理、消息队列等场景。

## @eggjs/redis

框架提供了 [@eggjs/redis](https://github.com/eggjs/egg/tree/next/plugins/redis) 插件来访问 Redis。该插件基于 [ioredis](https://github.com/redis/ioredis)，支持单客户端、多客户端和集群模式。

### 安装与配置

安装插件：

```bash
npm i @eggjs/redis
```

开启插件：

```ts
// config/plugin.ts
export default {
  redis: {
    enable: true,
    package: '@eggjs/redis',
  },
};
```

#### 单客户端

```ts
// config/config.default.ts
export default function () {
  return {
    redis: {
      client: {
        host: '127.0.0.1',
        port: 6379,
        password: '',
        db: 0,
      },
    },
  };
}
```

#### 多客户端

```ts
// config/config.default.ts
export default function () {
  return {
    redis: {
      clients: {
        cache: {
          host: '127.0.0.1',
          port: 6379,
          password: '',
          db: 0,
        },
        session: {
          host: '127.0.0.1',
          port: 6379,
          password: '',
          db: 1,
        },
      },
    },
  };
}
```

#### 集群模式

```ts
// config/config.default.ts
export default function () {
  return {
    redis: {
      client: {
        cluster: true,
        nodes: [
          { host: '127.0.0.1', port: 6380 },
          { host: '127.0.0.1', port: 6381 },
        ],
      },
    },
  };
}
```

### 使用方式

#### 单客户端

```ts
// app/controller/home.ts
import { Context } from 'egg';

export default class HomeController {
  async index(ctx: Context) {
    // 设置值
    await ctx.app.redis.set('foo', 'bar');

    // 获取值
    const value = await ctx.app.redis.get('foo');

    // 设置值并指定过期时间（秒）
    await ctx.app.redis.setex('temp', 60, '60秒后过期');

    // 删除键
    await ctx.app.redis.del('foo');

    ctx.body = value;
  }
}
```

#### 多客户端

使用多客户端模式时，通过 `app.redis.getSingletonInstance('clientName')` 获取对应的客户端实例：

```ts
// app/controller/home.ts
import { Context } from 'egg';

export default class HomeController {
  async index(ctx: Context) {
    const cache = ctx.app.redis.getSingletonInstance('cache');
    const session = ctx.app.redis.getSingletonInstance('session');

    await cache.set('key', 'value');
    await session.set('sid', 'session-data');

    ctx.body = await cache.get('key');
  }
}
```

### 常用命令

插件支持所有 [ioredis 命令](https://redis.github.io/ioredis/classes/Redis.html)。以下是一些常用命令：

| 命令       | 说明                       | 示例                                         |
| ---------- | -------------------------- | -------------------------------------------- |
| `set`      | 设置键值对                 | `await redis.set('key', 'value')`            |
| `get`      | 获取值                     | `await redis.get('key')`                     |
| `setex`    | 设置值并指定过期时间（秒） | `await redis.setex('key', 60, 'value')`      |
| `del`      | 删除键                     | `await redis.del('key')`                     |
| `incr`     | 自增                       | `await redis.incr('counter')`                |
| `hset`     | 设置哈希字段               | `await redis.hset('hash', 'field', 'value')` |
| `hget`     | 获取哈希字段               | `await redis.hget('hash', 'field')`          |
| `lpush`    | 从左侧推入列表             | `await redis.lpush('list', 'value')`         |
| `lpop`     | 从左侧弹出列表             | `await redis.lpop('list')`                   |
| `sadd`     | 添加集合成员               | `await redis.sadd('set', 'member')`          |
| `smembers` | 获取集合所有成员           | `await redis.smembers('set')`                |
| `zadd`     | 添加有序集合成员           | `await redis.zadd('zset', 1, 'member')`      |

### 在单元测试中使用 ioredis-mock

你可以使用 [ioredis-mock](https://github.com/stipsan/ioredis-mock) 在单元测试中替代真实的 Redis 客户端，无需运行 Redis 服务器即可进行测试。

#### 安装

```bash
npm i --save-dev ioredis-mock
```

#### 配置

```ts
// config/config.unittest.ts
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

> **重要**：使用 `ioredis-mock` 时必须设置 `weakDependent: true`。Mock 客户端会在构造时同步触发 `ready` 事件，早于插件的监听器注册。如果不设置 `weakDependent: true`，应用启动时会挂起。

#### 优势

- **更快的 CI**：无需启动 Redis Docker 容器
- **更简单的本地开发**：运行测试不需要 Redis 服务器
- **隔离性**：每个测试 worker 拥有独立的内存 Redis 实例
- **兼容性**：支持大部分常用 Redis 命令

> **注意**：生产环境部署测试仍应使用真实的 Redis 服务器。

### 高级配置

#### 弱依赖模式

如果你的应用可以在 Redis 未就绪时启动（例如 Redis 仅用作缓存，非关键依赖）：

```ts
// config/config.default.ts
export default function () {
  return {
    redis: {
      client: {
        host: '127.0.0.1',
        port: 6379,
        password: '',
        db: 0,
        weakDependent: true, // 应用启动不会等待 Redis 就绪
      },
    },
  };
}
```

#### 使用 Valkey

[Valkey](https://valkey.io/) 是 Redis 的兼容分支。可以通过 `Redis` 配置项使用：

```ts
import Valkey from 'iovalkey';

export default function () {
  return {
    redis: {
      Redis: Valkey,
      client: {
        host: '127.0.0.1',
        port: 6379,
        password: '',
        db: 0,
      },
    },
  };
}
```
