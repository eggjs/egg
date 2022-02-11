---
title: Socket.IO
---

**Socket.IO** is a real-time application framework based on Node.js, which has a wide range of applications including instant messaging, notification and message push, real-time analysis and other scenarios.

WebSocket originated from the growing demand for real-time communication in web development, compared with http-based polling, which greatly saves network bandwidth and reduces server performance consumption. [Socket.IO] supports both websockets and polling. The data transmission method is compatible with the browser and does not support the communication requirements under the WebSocket scenario.

The framework provides the [egg-socket.io] plugin with the following development rules added:

- namespace: define the namespace by means of configuration
   - middleware: establish / disconnect every socket connection, preprocess every message / data transfer
   - controller: response socket.io event
   - router: unify the processing configuration of socket.io event and frame routing

## install egg-socket.io

### Installation

```bash
$ npm i egg-socket.io --save
```

**Enable the plugin:**

```js
// {app_root} /config/plugin.js
exports.io = {
  enable: true,
  package: 'egg-socket.io',
};
```

### Configuration

```js
// {app_root} / config / config. $ {env} .js
exports.io = {
  init: {}, // passed to engine.io
  namespace: {
    '/': {
      connectionMiddleware: [],
      packetMiddleware: [],
    },
    '/ example': {
      connectionMiddleware: [],
      packetMiddleware: [],
    },
  },
};
```

> Namespaces are `/` and `/ example`, not`example`

#### `uws`

**Egg's socket is using `ws`, [uws](https://www.npmjs.com/package/uws) is deprecated due to [some reasons](https://github.com/socketio/socket.io/issues/3319).**
If you insist using [uws](https://www.npmjs.com/package/uws) instead of the default `ws`, you can config like this:

```js
// {app_root} / config / config. $ {env} .js
exports.io = {
  init: { wsEngine: 'uws' }, // default: ws
};
```

#### `redis`

[egg-socket.io] has built-in redis support via `socket.io-redis`. In cluster mode, the use of redis can make it relatively simple to achieve information sharing of clients/rooms and so on

```js
// {app_root} / config / config. $ {env} .js
exports.io = {
  redis: {
    host: {redis server host}
    port: {redis server port},
    auth_pass: {redis server password},
    db: 0,
  },
};
```

> When `redis` is turned on, the program tries to connect to the redis server at startup
> Here `redis` is only used to store connection instance information, see [# server.adapter](https://socket.io/docs/server-api/#server-adapter-value)

**Note:**
If the project also uses the `egg-redis`, please configure it separately. Do not share it.

### Deployment

If the framework is started in cluster mode, the socket.io protocol implementation needs sticky feature support, otherwise it will not work in multi-process mode.

Due to the design of socket.io, a multi-process server must be in the sticky working mode. As a result, you need the need to pass parameter `--sticky` when starting the cluster.

Modify the `npm scripts` script in`package.json`:

```js
{
  "scripts": {
    "dev": "egg-bin dev --sticky",
    "start": "egg-scripts start --sticky"
  }
}
```

**Nginx configuration**

```
location / {
  proxy_set_header Upgrade $ http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_set_header X-Forwarded-For $ proxy_add_x_forwarded_for;
  proxy_set_header Host $ host;
  proxy_pass http://127.0.0.1:7001;
}
```

## Using `egg-socket.io`

The directory structure of project which has enabled the [egg-socket.io] is as follows:

```
chat
├── app
│ ├── extend
│ │ └── helper.js
│ ├── io
│ │ ├── controller
│ │ │ └── default.js
│ │ └── middleware
│ │ ├── connection.js
│ │ └── packet.js
│ └── router.js
├── config
└── package.json
```

> Note: The corresponding files are in the app / io directory

### Middleware

Middleware has the following two scenarios:

- Connection
- Packet

It is configured in each namespace, respectively, according to the scenarios given above.

**Note:**

If we enable the framework middleware, you will find the following directory in the project:

- `app / middleware`: framework middleware
- `app / io / middleware`: plugin middleware

the difference:

- Framework middleware is based on http model design to handle http requests.
- Plugin middleware based socket model design, processing socket.io request.

Although the framework tries to unify the style through plugins, it is important to note that their usage scenarios are different. For details, please see: [# 1416](https://github.com/eggjs/egg/issues/1416)

#### Connection

Fires when each client connects or quits. Therefore, we usually perform authorization authentication at this step, and deal with the failed clients.

```js
// {app_root} /app/io/middleware/connection.js
module.exports = (app) => {
  return async (ctx, next) => {
    ctx.socket.emit('res', 'connected!');
    await next(); // execute when disconnect.
    console.log('disconnection!');
  };
};
```

Kick out the user example:

```js
const tick = (id, msg) => {
  logger.debug('# tick', id, msg);
  socket.emit(id, msg);
  app.io.of('/').adapter.remoteDisconnect(id, true, (err) => {
    logger.error(err);
  });
};
```

At the same time, the current connection can also be simple to deal with:

```js
// {app_root} /app/io/middleware/connection.js
module.exports = (app) => {
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

Acts on each data packet (each message). In the production environment, it is usually used to preprocess messages, or it is used to decrypt encrypted messages.

```js
// {app_root} /app/io/middleware/packet.js
module.exports = (app) => {
  return async (ctx, next) => {
    ctx.socket.emit('res', 'packet received!');
    console.log('packet:', ctx.packet);
    await next();
  };
};
```

### Controller

A controller deals with the events sent by the client. Since it inherits the `egg.controller`, it has the following member objects:

- ctx
- app
- service
- config
- logger

> For details, refer to the [Controller] (../ basics / controller.md) documentation

```js
// {app_root} /app/io/controller/default.js
'use strict';

const Controller = require('egg').Controller;

class DefaultController extends Controller {
  async ping() {
    const { ctx, app } = this;
    const message = ctx.args[0];
    await ctx.socket.emit('res', `Hi! I've got your message: $ {message}`);
  }
}

module.exports = DefaultController;

// or async functions

exports.ping = async function () {
  const message = this.args[0];
  await this.socket.emit('res', `Hi! I've got your message: $ {message}`);
};
```

### Router

Routing is responsible for passing various events received by the socket to the corresponding controllers.

```js
// {app_root} /app/router.js

module.exports = (app) => {
  const { router, controller, io } = app; // default
  router.get('/', controller.home.index); // socket.io
  io.of('/').route('server', io.controller.home.server);
};
```

**Note:**

Nsp has the following system events:

- `disconnecting` doing the disconnect
- `disconnect` connection has disconnected.
- `error` Error occurred

### Namespace/Room

#### Namespace (nsp)

The namespace is usually meant to be assigned to different access points or paths. If the client does not specify a nsp, it is assigned to "/" by default.

In socket.io we use the `of` to divide the namespace; given that nsp is usually pre-defined and relatively fixed, the framework encapsulates it and uses configuration to partition different namespaces.

```js
// socket.io
var nsp = io.of('/my-namespace');
nsp.on('connection', function (socket) {
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

Room exists in nsp and is added or left by the join/leave method; the method used in the framework is the same;

```js
Const room = 'default_room';

Module.exports = app => {
   return async (ctx, next) => {
     ctx.socket.join(room);
     ctx.app.io.of('/').to(room).emit('online', { msg: 'welcome', id: ctx.socket.id });
     await next();
     console.log('disconnection!');
   };
};
```

**Note:** Each socket connection will have a random and unpredictable unique id `Socket#id` and will automatically be added to the room named after this `id`

## Examples

Here we use [egg-socket.io] to do a small example which supports p2p chat

### Client

The UI-related content is not rewritten. It can be called via window.socket

```js
// browser
const log = console.log;

window.onload = function () {
  // init
  const socket = io('/', {
    // Actual use can pass parameters here
    query: {
      room: 'demo',
      userId: `client_${Math.random()}`,
    },

    transports: ['websocket'],
  });

  socket.on('connect', () => {
    const id = socket.id;

    log('#connect,', id, socket); // receive online user information

    // listen for its own id to implement p2p communication
    socket.on(id, (msg) => {
      log('#receive,', msg);
    });
  });

  socket.on('online', (msg) => {
    log('#online,', msg);
  });

  // system events
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

#### WeChat Applets

The API provided by the WeChat applet is WebSocket, and socket.io is the upper encapsulation of Websocket. Therefore, we cannot directly use the API connection of the applet. You can use something like [wxapp-socket-io] (https://github.com/wxsocketio /wxapp-socket-io) to adapt to the library.

The sample code is as follows:

```js
// Small program-side sample code
import io from 'vendor/wxapp-socket-io.js';

const socket = io('ws://127.0.0.1:7001');
socket.on('connect', function () {
  socket.emit('chat', 'hello world!');
});
socket.on('res', (msg) => {
  console.log('res from server: %s!', msg);
});
```

### Server

The following is part of the demo code and explains the role of each method:

#### Config

```js
// {app_root}/config/config.${env}.js
exports.io = {
  namespace: {
    '/': {
      connectionMiddleware: ['auth'],
      packetMiddleware: [], // processing for message is not implemented temporarily
    },
  }, // Data sharing through redis in cluster mode

  redis: {
    host: '127.0.0.1',
    port: 6379,
  },
};
```

#### Helper

Framework extensions for encapsulating data formats

```js
// {app_root}/app/extend/helper.js

module.exports = {
  parseMsg(action, payload = {}, metadata = {}) {
    const meta = Object.assign(
      {},
      {
        timestamp: Date.now(),
      },
      metadata,
    );

    return {
      data: {
        action,
        payload,
      },
      meta,
    };
  },
};
```

Format：

```js
{
  data: {
    action: 'exchange',  // 'deny' || 'exchange' || 'broadcast'
    payload: {},
  },
  meta:{
    timestamp: 1512116201597,
    client: '/webrtc#nNx88r1c5WuHf9XuAAAB',
    target: '/webrtc#nNx88r1c5WuHf9XuAAAB'
  },
}
```

#### Middleware

[egg-socket.io] middleware handles socket connection handling

```js
// {app_root}/app/io/middleware/auth.js

const PREFIX = 'room';

module.exports = () => {
  return async (ctx, next) => {
    const { app, socket, logger, helper } = ctx;
    const id = socket.id;
    const nsp = app.io.of('/');
    const query = socket.handshake.query; // User Info

    const { room, userId } = query;
    const rooms = [room];

    logger.debug('#user_info', id, room, userId);

    const tick = (id, msg) => {
      logger.debug('#tick', id, msg); // Send message before kicking user

      socket.emit(id, helper.parseMsg('deny', msg)); // Call the adapter method to kick out the user and the client triggers the disconnect event

      nsp.adapter.remoteDisconnect(id, true, (err) => {
        logger.error(err);
      });
    }; // Check if the room exists, kick it out if it doesn't exist // Note: here app.redis has nothing to do with the plugin, it can be replaced by other storage

    const hasRoom = await app.redis.get(`${PREFIX}:${room}`);

    logger.debug('#has_exist', hasRoom);

    if (!hasRoom) {
      tick(id, {
        type: 'deleted',
        message: 'deleted, room has been deleted.',
      });
      return;
    } // When the user joins

    nsp.adapter.clients(rooms, (err, clients) => {
      // Append current socket information to clients
      clients[id] = query; // Join room

      socket.join(room);

      logger.debug('#online_join', _clients); // Update online user list

      nsp.to(room).emit('online', {
        clients,
        action: 'join',
        target: 'participator',
        message: `User(${id}) joined.`,
      });
    });

    await next(); // When the user leaves

    nsp.adapter.clients(rooms, (err, clients) => {
      logger.debug('#leave', room);

      const _clients = {};
      clients.forEach((client) => {
        const _id = client.split('#')[1];
        const _client = app.io.sockets.sockets[_id];
        const _query = _client.handshake.query;
        _clients[client] = _query;
      });

      logger.debug('#online_leave', _clients); // Update online user list

      nsp.to(room).emit('online', {
        clients: _clients,
        action: 'leave',
        target: 'participator',
        message: `User(${id}) leaved.`,
      });
    });
  };
};
```

#### Controller

Data exchange of P2P communication is through exchange

```js
// {app_root}/app/io/controller/nsp.js
const Controller = require('egg').Controller;

class NspController extends controller {
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

#### Router

```js
// {app_root}/app/router.js
module.exports = (app) => {
  const { router, controller, io } = app;
  router.get('/', controller.home.index); // socket.io

  io.of('/').route('exchange', io.controller.nsp.exchange);
};
```

Open two tab pages and call up the console:

```js
socket.emit('exchange', {
  target: '/webrtc#Dkn3UXSu8_jHvKBmAAHW',
  payload: {
    msg: 'test',
  },
});
```

![](https://raw.githubusercontent.com/eggjs/egg/master/docs/assets/socketio-console.png)

## Reference Links

- [socket.io]
- [egg-socket.io]
- [egg-socket.io example](https://github.com/eggjs/egg-socket.io/tree/master/example)

[socket.io]: https://socket.io
[egg-socket.io]: https://github.com/eggjs/egg-socket.io
[uws]: https://github.com/uWebSockets/uWebSockets
