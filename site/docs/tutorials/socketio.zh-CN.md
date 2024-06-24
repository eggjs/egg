---
title: Socket.IO
---

**Socket.IO** 是一个基于 Node.js 的实时应用程序框架。在即时通讯、通知与消息推送，实时分析等场景中有较为广泛的应用。

WebSocket 的产生源于 Web 开发中日益增长的实时通信需求。对比传统的基于 http 的轮询方式，它大大节约了网络带宽，同时也降低了服务器的性能消耗。`socket.io` 支持 websocket 和 polling 两种数据传输方式，以兼容不支持 WebSocket 的浏览器。

框架提供了 `egg-socket.io` 插件，增加了以下开发规约：

- namespace：通过配置的方式定义 namespace（命名空间）。
- middleware：对每一次 socket 连接的建立/断开、每一次消息/数据传递进行预处理。
- controller：响应 `socket.io` 的 event 事件。
- router：统一了 `socket.io` 的 event 与框架路由的处理配置方式。

## 安装 egg-socket.io

### 安装

```bash
$ npm i egg-socket.io --save
```

**开启插件：**

```javascript
// {app_root}/config/plugin.js
exports.io = {
    enable: true,
    package: 'egg-socket.io',
};
```

### 配置

```javascript
// {app_root}/config/config.${env}.js
exports.io = {
    init: {}, // 传递给 engine.io
    namespace: {
        '/': {
            connectionMiddleware: [],
            packetMiddleware: [],
        },
        '/example': {
            connectionMiddleware: [],
            packetMiddleware: [],
        },
    },
};
```

> 命名空间为 `/` 与 `/example`，而不是 `example`。

#### uws

**Egg Socket 内部默认使用 `ws` 引擎。`uws` 因为[某些原因](https://github.com/socketio/socket.io/issues/3319)被废止了。**

如果坚持要使用 `uws`，请按照以下配置：

```javascript
// {app_root}/config/config.${env}.js
exports.io = {
    init: { wsEngine: 'uws' }, // 默认是 ws
};
```

#### redis

`egg-socket.io` 内置了 `socket.io-redis`。在 cluster 模式下，使用 redis 可以简单地实现 clients/rooms 等信息共享。

```javascript
// {app_root}/config/config.${env}.js
exports.io = {
    redis: {
        host: { redis server host },
        port: { redis server port },
        auth_pass: { redis server password },
        db: 0,
    },
};
```

> 开启 `redis` 后，程序在启动时会尝试连接到 redis 服务器。此处的 `redis` 仅用于存储连接实例信息，详见 [#server.adapter](https://socket.io/docs/server-api/#server-adapter-value)。

**注意：**
如果项目中同时使用了 `egg-redis`，请分别配置，不可共用。

### 部署

由于框架是以 Cluster 方式启动的，而 `socket.io` 协议实现需要 sticky 特性支持，在多进程模式下才能正常工作。

由于 `socket.io` 的设计，多进程服务器必须在 `sticky` 模式下工作。因此，需要给 startCluster 传递 sticky 参数。

修改 `package.json` 中的 npm scripts 脚本：

```json
{
    "scripts": {
        "dev": "egg-bin dev --sticky",
        "start": "egg-scripts start --sticky"
    }
}
```

**Nginx 配置**

```nginx
location / {
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header Host $host;
    proxy_pass   http://127.0.0.1:7001;

    # http://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_bind
```

## 使用 `egg-socket.io`

开启 [egg-socket.io] 的项目目录结构如下：

```
chat
├── app
│   ├── extend
│   │   └── helper.js
│   ├── io
│   │   ├── controller
│   │   │   └── default.js
│   │   └── middleware
│   │       ├── connection.js
│   │       └── packet.js
│   └── router.js
├── config
└── package.json
```

> 注意：对应的文件都在 `app/io` 目录下。

### Middleware

中间件有以下两种场景：

- Connection
- Packet

它们的配置位于各个命名空间下，根据上述两种场景分别起作用。

**注意：**

如果启用了框架中间件，会在项目中发现以下目录：

- `app/middleware`：框架中间件。
- `app/io/middleware`：插件中间件。

两者的区别：

- 框架中间件基于 HTTP 模型设计，处理 HTTP 请求。
- 插件中间件基于 socket 模型设计，处理 `socket.io` 请求。

虽然框架通过插件尽量统一了它们的风格，但必须注意，它们的使用场景是不同的。详情请参见 issue [#1416](https://github.com/eggjs/egg/issues/1416)。

#### Connection

每个客户端连接或退出时起作用。因此，通常在这一步进行授权认证，并对认证失败的客户端进行处理。

```js
// {app_root}/app/io/middleware/connection.js
module.exports = app => {
  return async (ctx, next) => {
    ctx.socket.emit('res', 'connected!');
    await next();
    // execute when disconnect.
    console.log('disconnection!');
  };
};
```

踢出用户示例：

```js
const tick = (id, msg) => {
  logger.debug('#tick', id, msg);
  socket.emit(id, msg);
  app.io.of('/').adapter.remoteDisconnect(id, true, err => {
    logger.error(err);
  });
};
```

针对当前连接的简单处理示例：

```js
// {app_root}/app/io/middleware/connection.js
module.exports = app => {
  return async (ctx, next) => {
    if (true) {
      ctx.socket.disconnect();
      return;
    }
    await next();
    console.log('disconnection!');
  };
};
```

#### Packet

每条数据包（消息）都会执行该中间件。在生产环境中，通常用于对消息做预处理，或者对加密消息进行解密等操作。

```js
// {app_root}/app/io/middleware/packet.js
module.exports = app => {
  return async (ctx, next) => {
    ctx.socket.emit('res', 'packet received!');
    console.log('packet:', ctx.packet);
    await next();
  };
};
```
### Controller

Controller 对客户端发送的 event 进行处理；由于其继承自 `egg.Controller`，拥有以下成员对象：

- `ctx`
- `app`
- `service`
- `config`
- `logger`

详情参考 [Controller](../basics/controller.md) 文档。

```js
// {app_root}/app/io/controller/default.js
'use strict';

const Controller = require('egg').Controller;

class DefaultController extends Controller {
  async ping() {
    const { ctx } = this;
    const message = ctx.args[0];
    await ctx.socket.emit('res', `Hi! I've got your message: ${message}`);
  }
}

module.exports = DefaultController;
```

### Router

路由负责将 socket 连接的不同 events 分发到对应的 controller，框架统一了其使用方式。

```js
// {app_root}/app/router.js

module.exports = app => {
  const { router, controller, io } = app;
  
  // default
  router.get('/', controller.home.index);
  
  // socket.io
  io.of('/').route('server', io.controller.home.server);
};
```

**注意：**

`nsp` 有如下的系统事件：

- `disconnecting`：正在断开连接。
- `disconnect`：连接已断开。
- `error`：发生错误。

### Namespace/Room

#### Namespace (nsp)

`namespace` 通常意味着分配到不同的接入点或者路径，如果客户端没有指定 `nsp`，则默认分配到 "/" 这个默认的命名空间。

在 socket.io 中我们通过 `of` 来划分命名空间；鉴于 `nsp` 通常是预定义且相对固定的存在，框架将其进行了封装，采用配置的方式来划分不同的命名空间。

```js
// socket.io
const nsp = io.of('/my-namespace');
nsp.on('connection', socket => {
  console.log('someone connected');
});
nsp.emit('hi', 'everyone!');

// egg
exports.io = {
  namespace: {
    '/': {
      connectionMiddleware: [],
      packetMiddleware: [],
    },
  },
};
```

#### Room

`room` 存在于 `nsp` 中，通过 `join`/`leave` 方法来加入或者离开；框架中使用方法相同。

```js
const room = 'default_room';

module.exports = app => {
  return async (ctx, next) => {
    ctx.socket.join(room);
    ctx.app.io
      .of('/')
      .to(room)
      .emit('online', { msg: 'welcome', id: ctx.socket.id });
    await next();
    console.log('disconnection!');
  };
};
```

**注意：** 每一个 socket 连接都会拥有一个随机且不可预测的唯一 id `Socket#id`，并且会自动加入到以这个 `id` 命名的 `room` 中。
## 实例

这里我们使用 [egg-socket.io](https://github.com/eggjs/egg-socket.io) 来做一个支持 P2P 聊天的小例子。

### 客户端

UI 相关的内容不重复编写，通过 `window.socket` 调用即可。

```js
// 浏览器
const log = console.log;

window.onload = function () {
    // 初始化
    const socket = io('/', {
        // 实际使用中可以在这里传递参数
        query: {
            room: 'demo',
            userId: `client_${Math.random()}`, // 传递了 room 和 userId 两个参数
        },

        transports: ['websocket'],
    });

    socket.on('connect', () => {
        const id = socket.id;

        log('#connect,', id, socket);

        // 监听自身 id，以实现 P2P 通讯
        socket.on(id, (msg) => {
            log('#receive,', msg);
        });
    });

    // 接收在线用户信息
    socket.on('online', (msg) => {
        log('#online,', msg);
    });

    // 系统事件
    socket.on('disconnect', (msg) => {
        log('#disconnect', msg);
    });

    socket.on('disconnecting', () => {
        log('#disconnecting');
    });

    socket.on('error', () => {
        log('#error');
    });

    window.socket = socket;
};
```

#### 微信小程序

微信小程序提供的 API 为 `WebSocket` ，因为 `socket.io` 是 `WebSocket` 的上层封装，所以我们无法直接使用小程序的 API 连接。可以使用类似 [weapp.socket.io](https://github.com/wxsocketio/weapp.socket.io) 的库适配。

示例代码如下：

```js
// 小程序端示例代码
const io = require('./your_path/weapp.socket.io.js'); // 请替换成实际路径

const socket = io('http://localhost:8000');

socket.on('connect', function () {
    console.log('connected');
});

socket.on('news', (d) => {
    console.log('received news:', d);
});

socket.emit('news', {
    title: 'this is a news',
});
```
### server

以下是 `demo` 的部分代码，并解释了各个方法的作用。

#### config

```js
// {app_root}/config/config.${env}.js
exports.io = {
  namespace: {
    '/': {
      connectionMiddleware: ['auth'],
      packetMiddleware: [] // 针对消息的处理暂时不实现
    }
  },

  // cluster 模式下，通过 redis 实现数据共享
  redis: {
    host: '127.0.0.1',
    port: 6379
  }
};

// 可选
exports.redis = {
  client: {
    port: 6379,
    host: '127.0.0.1',
    password: '',
    db: 0
  }
};
```

#### helper

框架扩展用于封装数据格式。

```js
// {app_root}/app/extend/helper.js

module.exports = {
  parseMsg(action, payload = {}, metadata = {}) {
    const meta = Object.assign({}, { timestamp: Date.now() }, metadata);

    return {
      meta,
      data: {
        action,
        payload
      }
    };
  }
};
```

Format：

```js
{
  data: {
    action: 'exchange', // 'deny' || 'exchange' || 'broadcast'
    payload: {}
  },
  meta: {
    timestamp: 1512116201597,
    client: 'nNx88r1c5WuHf9XuAAAB',
    target: 'nNx88r1c5WuHf9XuAAAB'
  }
}
```
#### 中间件

[egg-socket.io] 中间件负责处理 socket 连接。

```js
// {app_root}/app/io/middleware/auth.js

const PREFIX = 'room';

module.exports = () => {
  return async (ctx, next) => {
    const { app, socket, logger, helper } = ctx;
    const id = socket.id;
    const nsp = app.io.of('/');
    const query = socket.handshake.query;

    // 用户信息
    const { room, userId } = query;
    const rooms = [room];

    logger.debug('#user_info', id, room, userId);

    const tick = (id, msg) => {
      logger.debug('#tick', id, msg);

      // 踢出用户前发送信息
      socket.emit(id, helper.parseMsg('deny', msg));

      // 调用 adapter 方法踢出用户，客户端会触发 disconnect 事件
      nsp.adapter.remoteDisconnect(id, true, (err) => {
        logger.error(err);
      });
    };

    // 检查房间是否存在，不存在则踢出用户
    // 注：此处 app.redis 与插件无关，可用其他存储替代
    const hasRoom = await app.redis.get(`${PREFIX}:${room}`);

    logger.debug('#has_exist', hasRoom);

    // 若房间不存在
    if (!hasRoom) {
      tick(id, {
        type: 'deleted',
        message: 'deleted, room has been deleted.'
      });
      return;
    }

    // 用户加入房间
    logger.debug('#join', room);
    socket.join(room);

    // 获取在线列表
    nsp.adapter.clients(rooms, (err, clients) => {
      logger.debug('#online_join', clients);

      // 更新在线用户列表
      nsp.to(room).emit('online', {
        clients,
        action: 'join',
        target: 'participator',
        message: `User(${id}) joined.`
      });
    });

    await next();

    // 用户离开房间
    logger.debug('#leave', room);

    // 获取在线列表
    nsp.adapter.clients(rooms, (err, clients) => {
      logger.debug('#online_leave', clients);

      // 更新在线用户列表
      nsp.to(room).emit('online', {
        clients,
        action: 'leave',
        target: 'participator',
        message: `User(${id}) leaved.`
      });
    });
  };
};
```

#### 控制器

P2P 通信，通过 exchange 方法实现数据交换。

```js
// {app_root}/app/io/controller/nsp.js
const Controller = require('egg').Controller;

class NspController extends Controller {
  async exchange() {
    const { ctx, app } = this;
    const nsp = app.io.of('/');
    const message = ctx.args[0] || {};
    const socket = ctx.socket;
    const client = socket.id;

    try {
      const { target, payload } = message;
      if (!target) return;
      const msg = ctx.helper.parseMsg('exchange', payload, { client, target });
      nsp.emit(target, msg);
    } catch (error) {
      app.logger.error(error);
    }
  }
}

module.exports = NspController;
```
#### router

```js
// {app_root}/app/router.js
module.exports = (app) => {
  const { router, controller, io } = app;
  router.get('/', controller.home.index);

  // socket.io
  io.of('/').route('exchange', io.controller.nsp.exchange);
};
```

打开两个 tab 页面，并调出控制台：

```js
socket.emit('exchange', {
  target: 'Dkn3UXSu8_jHvKBmAAHW',
  payload: {
    msg: 'test',
  },
});
```

![](https://raw.githubusercontent.com/eggjs/egg/master/docs/assets/socketio-console.png)


## 参考链接

- [socket.io](https://socket.io)
- [egg-socket.io](https://github.com/eggjs/egg-socket.io)
- [egg-socket.io 示例](https://github.com/eggjs/egg-socket.io/tree/master/example)（egg-socket.io example）
- [egg-socket.io 演示](https://github.com/eggjs-community/demo-egg-socket.io)（egg-socket.io demo）
- [nginx 代理绑定](http://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_bind)（nginx proxy_bind）


[socket.io]: https://socket.io
[egg-socket.io]: https://github.com/eggjs/egg-socket.io
[uws]: https://github.com/uWebSockets/uWebSockets
