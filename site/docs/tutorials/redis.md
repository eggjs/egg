---
title: Redis
---

[Redis](https://redis.io/) is a high-performance in-memory data store widely used for caching, session management, message queues, and more.

## @eggjs/redis

The framework provides the [@eggjs/redis](https://github.com/eggjs/egg/tree/next/plugins/redis) plugin to access Redis. This plugin is based on [ioredis](https://github.com/redis/ioredis) and supports single client, multi-client, and cluster modes.

### Installation and Configuration

Install the plugin:

```bash
npm i @eggjs/redis
```

Enable the plugin:

```ts
// config/plugin.ts
export default {
  redis: {
    enable: true,
    package: '@eggjs/redis',
  },
};
```

#### Single Client

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

#### Multi Client

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

#### Cluster Mode

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

### Usage

#### Single Client

```ts
// app/controller/home.ts
import { Context } from 'egg';

export default class HomeController {
  async index(ctx: Context) {
    // set a value
    await ctx.app.redis.set('foo', 'bar');

    // get a value
    const value = await ctx.app.redis.get('foo');

    // set with expiration (seconds)
    await ctx.app.redis.setex('temp', 60, 'expires in 60s');

    // delete a key
    await ctx.app.redis.del('foo');

    ctx.body = value;
  }
}
```

#### Multi Client

When using multi-client mode, access each client via `app.redis.getSingletonInstance('clientName')`:

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

### Common Commands

The plugin supports all [ioredis commands](https://redis.github.io/ioredis/classes/Redis.html). Here are some commonly used ones:

| Command    | Description                   | Example                                      |
| ---------- | ----------------------------- | -------------------------------------------- |
| `set`      | Set a key-value pair          | `await redis.set('key', 'value')`            |
| `get`      | Get a value by key            | `await redis.get('key')`                     |
| `setex`    | Set with expiration (seconds) | `await redis.setex('key', 60, 'value')`      |
| `del`      | Delete a key                  | `await redis.del('key')`                     |
| `incr`     | Increment a number            | `await redis.incr('counter')`                |
| `hset`     | Set a hash field              | `await redis.hset('hash', 'field', 'value')` |
| `hget`     | Get a hash field              | `await redis.hget('hash', 'field')`          |
| `lpush`    | Push to a list                | `await redis.lpush('list', 'value')`         |
| `lpop`     | Pop from a list               | `await redis.lpop('list')`                   |
| `sadd`     | Add to a set                  | `await redis.sadd('set', 'member')`          |
| `smembers` | Get all set members           | `await redis.smembers('set')`                |
| `zadd`     | Add to a sorted set           | `await redis.zadd('zset', 1, 'member')`      |

### Using ioredis-mock for Unit Tests

You can use [ioredis-mock](https://github.com/stipsan/ioredis-mock) to replace the real Redis client in unit tests. This eliminates the need for a running Redis server during testing.

#### Install

```bash
npm i --save-dev ioredis-mock
```

#### Configure

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
      },
    },
  };
}
```

When `config.redis.Redis` is set to a custom class (other than the built-in ioredis), the plugin automatically enables `weakDependent` mode. This prevents startup hangs that can occur when mock clients emit the `ready` event synchronously.

#### Benefits

- **Faster CI**: No need to spin up Redis Docker containers
- **Simpler local dev**: No Redis server required for running tests
- **Isolated**: Each test worker gets its own in-memory Redis instance
- **Compatible**: Supports most common Redis commands

> **Note**: For production deployment testing, you should still use a real Redis server.

### Advanced Configuration

#### Weak Dependent

If your application can start without Redis being ready (e.g., Redis is used as a cache and is not critical):

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
        weakDependent: true, // app start won't wait for Redis to be ready
      },
    },
  };
}
```

#### Using Valkey

[Valkey](https://valkey.io/) is a Redis-compatible fork. You can use it with the `Redis` config option:

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
