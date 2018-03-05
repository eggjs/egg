## title: Socket.IO

** Socket.IO ** is a real-time application framework based on NodeJS, which has a wide range of applications including instant messaging, notification and message push, real-time analysis and other scenarios.

WebSocket originated from the growing demand for real-time communication in web development, compared with http-based polling, which greatly saves network bandwidth and reduces server performance consumption. [Socket.IO] supports both websockets and polling. The data transmission method is compatible with the browser and does not support the communication requirements under the WebSocket scenario.

The framework provides the [egg-socket.io] plugin with the following development rules added:

* namespace: define the namespace by means of configuration
   - middleware: every socket connection to establish / disconnect, every message / data transfer pretreatment
   - conbothtroller: response socket.io event
   - router: unified socket.io event and frame routing configuration processing

## install egg-socket.io

### Installation

```bash
$ npm i egg-socket.io --save
```

** Open the plugin: **

```js
// {app_root} /config/plugin.js
exports.io = {
  enable: true,
  package: 'egg-socket.io'
};
```

### configuration

```js
// {app_root} / config / config. $ {env} .js
exports.io = {
  init: {}, // passed to engine.io
  namespace: {
    '/': {
      connectionMiddleware: [],
      packetMiddleware: []
    },
    '/ example': {
      connectionMiddleware: [],
      packetMiddleware: []
    }
  }
};
```

> Namespaces are `/` and `/ example`, not`example`

** uws: **

If you want to use [uws] instead of the default `us` you can do the following configuration

```js
// {app_root} / config / config. $ {env} .js
exports.io = {
  init: { wsEngine: 'uws' } // default: us
};
```

** redis: **

[egg-socket.io] has builtin redis support via `socket.io-redis`. In cluster mode, the use of redis can make it relatively simple to achieve clients / rooms and other information sharing.

```js
// {app_root} / config / config. $ {env} .js
exports.io = {
  redis: {
    host: {redis server host}
    port: {redis server prot},
    auth_pass: {redis server password},
    db: 0,
  },
};
```

> When `redis` is turned on, the program tries to connect to the redis server at startup
> Here `redis` is only used to store connection instance information, see [# server.adapter](https://socket.io/docs/server-api/#server-adapter-value)

**note:**
If the project also uses the egg-redis`, please configure it separately. Do not share it.

### Deploying

In cluster environment socket.io requires you to use sticky sessions, to ensure that a given client hits the same process every time, otherwise its handshake mechanism won't work properly.

As a result, if the framework is started in cluster mode, you need to make sure that the sticky sessions are enabled.

Modify the `npm scripts` script in`package.json`:

```js
{
  "scripts": {
    "dev": "egg-bin dev --sticky",
    "start": "egg-scripts start --sticky"
  }
}
```

** Nginx configuration **

```
location / {
  proxy_set_header Upgrade $ http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_set_header X-Forwarded-For $ proxy_add_x_forwarded_for;
  proxy_set_header Host $ host;
  proxy_pass http://127.0.0.1:7001;
}
```

## Using egg-socket.io

Open the [egg-socket.io] project directory structure is as follows:

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

* Connection
* Packet

It is configured in each namespace, respectively, according to the scenarios given above.

**note:**

If we enable the framework middleware, you will find the following directory in the project:

* `app / middleware`: framework middleware
* `app / io / middleware`: plug-in middleware

the difference:

* Framework middleware based on http model design, handling http request.
* Plug-in middleware based socket model design, processing socket.io request.

Although the framework tries to unify the style through plugins, it is important to note that their usage scenarios are different. For details, please see: [# 1416](https://github.com/eggjs/egg/issues/1416)

#### Connection

Once a client is connected, you can execute the desired logic. Authentication/Authorization is usually performed in this step to decide which action to take.

```js
// {app_root} /app/io/middleware/connection.js
module.exports = app => {
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
  app.io.of('/').adapter.remoteDisconnect(id, true, err => {
    logger.error(err);
  });
};
```

At the same time, the current connection can also be simple to deal with:

```js
// {app_root} /app/io/middleware/connection.js
module.exports = app => {
  return async (ctx, next) => {
    if (true) {
      ctx.socket.disconnet();
      return;
    }
    await next();
    console.log('disconnection!');
  };
};
```

#### Packet

Packets can be used to preprocess the message or to decrypt an encrypted message.

```js
// {app_root} /app/io/middleware/packet.js
module.exports = app => {
  return async (ctx, next) => {
    ctx.socket.emit('res', 'packet received!');
    console.log('packet:', this.packet);
    await next();
  };
};
```

### Controller

A controller deals with the events sent by the client. Since it inherits the `egg.Contoller`, it has the following member objects:

* ctx
* app
* service
* config
* logger

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

exports.ping = async function() {
  const message = this.args[0];
  await this.socket.emit('res', `Hi! I've got your message: $ {message}`);
};
```

### Router

Routing is responsible for passing various events received by the socket to the corresponding controllers

```js
// {app_root} /app/router.js

module.exports = app => {
  const { router, controller, io } = app; // default
  router.get('/', controller.home.index); // socket.io
  io.of('/').route('server', io.controller.home.server);
};
```
