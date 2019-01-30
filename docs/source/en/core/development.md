title: Local Development
---

To improve development experience, convenient ways to develop in local environment, debug and run unit testing are provided in egg. 

Here, wo will need to use [egg-bin] module (Only used in local development and unit testing. For production environment, please refer to [Deployment](./deployment.md)).

First of all, we need to include `egg-bin` module in `devDependencies`:

```bash
$ npm i egg-bin --save-dev
```

## Start App

Once we have modified code and saved in local development, the app will restart automatically, and our changes will take place right after that. 

### Add Script

Add `npm scripts` into `package.json`：

```json
{
  "scripts": {
    "dev": "egg-bin dev"
  }
}
```

And then we may start app by command `npm run dev`.

### Config Environment

To start app in local, environment need to be set as `env: local`. The configuration being read is an object combined from `config.local.js` and `config.default.js` files.

### Assign Port

Starting app in local will listen to port 7001 by default. You may assign other port to it like this:

```json
{
  "scripts": {
    "dev": "egg-bin dev --port 7001"
  }
}
```

## Unit Test

This chapter is mainly about the usage of tools. For more details about unit testing, please refer to [here](./unittest.md).

### Add Script

Add `npm scripts` into `package.json`：

```json
{
  "scripts": {
    "test": "egg-bin test"
  }
}
```

And then we can run unit testing by command `npm test`.

### Config Environment

To run test cases, environment need to be set as `env: unittest`. The configuration being read is an object combined from `config.local.js` and `config.unittest.js` files.

### Run Test On Single File

`npm test` command will look for all the files ended with `.test.js` under test folder (default [glob] matching rule is `test/**/*.test.js`).

However, we would like to run only the test cases that we are working on sometimes. In this case, we may specify a file by following way:

```bash
$ TESTS=test/x.test.js npm test
```

[glob] expressions are supported here.

### Set Reporter

Mocha supports various reporters. Default reporter is `spec`.

Reporter is allowed to be specified mannually via setting `TEST_REPORTER` environment variable. For example, to use `dot` instead:

```bash
$ TEST_REPORTER=dot npm test
```

![image](https://cloud.githubusercontent.com/assets/156269/21849809/a6fe6df8-d842-11e6-8507-20da63bc8b62.png)

### Set Timeout

The default timeout is 30 seconds. We may set our own timeout (in milliseconds). For example, setting timeout to 5 seconds:

```bash
$ TEST_TIMEOUT=5000 npm test
```

### Pass Parameters Via argv

Besides to environment variables, `egg-bin test` also supports passing parameters directly, and it supports all mocha parameters. You may refer to [mocha usage](https://mochajs.org/#usage).

```bash
$ # Passing parameters via npm need to add an extra `--`, according to https://docs.npmjs.com/cli/run-script
$ npm test -- --help
$
$ # Equivalent to `TESTS=test/**/test.js npm test`. Since the limitation of bash, it's better to add double qoute to path.
$ npm test "test/**/test.js"
$
$ # Equivalent to `TEST_REPORTER=dot npm test`
$ npm test -- --reporter=dot
$
$ # Parameters of mocha are supported, such as grep, require, etc.
$ npm test -- -t 30000 --grep="should GET"
```

## Code Coverage

egg-bin has build-in [nyc](https://github.com/istanbuljs/nyc) to support calculating code coverage report of unit testing.

Add `npm scripts` into `package.json`：

```json
{
  "scripts": {
    "cov": "egg-bin cov"
  }
}
```

And then we can get code coverage report of unit testing via command `npm run cov`.

```bash
$ egg-bin cov

  test/controller/home.test.js
    GET /
      ✓ should status 200 and get the body
    POST /post
      ✓ should status 200 and get the request body

  ...

  16 passing (1s)

=============================== Coverage summary ===============================
Statements   : 100% ( 41/41 )
Branches     : 87.5% ( 7/8 )
Functions    : 100% ( 10/10 )
Lines        : 100% ( 41/41 )
================================================================================
```

And we may open HTML file of complete code coverage report via command `open coverage/lcov-report/index.html`.

![image](https://cloud.githubusercontent.com/assets/156269/21845201/a9a85ab6-d82c-11e6-8c24-5e85f352be4a.png)

### Config Environment

Same as `test` script, to run `cov`, environment need to be set to `env: unittest` as well. The configuration is also an object combined from `config.local.js` and `config.unittest.js` files.

### Ignore Files

To ignore some files in code coverage rate calculation, you may use `COV_EXCLUDES` environment variable to achieve this:

```bash
$ COV_EXCLUDES=app/plugins/c* npm run cov
$ # Or pass this setting via parameters
$ npm run cov -- --x=app/plugins/c*
```

## Debug

### Print Logs

### Use Logger Module

There's built-in [Log](./logger.md) in egg. You may use `logger.debug()` to print out debug information. **It is recommended to be used in your implementation.**

```js
// controller
this.logger.debug('current user: %j', this.user);

// service
this.ctx.logger.debug('debug info from service');

// app/init.js
app.logger.debug('app init');
```

Levels of logs can be configured via `config.logger.level` for printing into file, and `config.logger.consoleLevel` for printing into console.

### Use Debug Module

[debug](https://www.npmjs.com/package/debug) module is a debug tool which is widely adopted in Node.js community. Plenty of modules are using it to print debug information. Egg community has widely adopted it as well. **It is recommended to be used in framework and plugin development**

To watch on the running process, we may start with certain code for debugging via `DEBUG` enviroment variable.

(Do not confuse debug module and logger module. There are lots more stuff provided by logger module, but the log here we are talking about is debug information.)

Turn on log of all modules:

```bash
$ DEBUG=* npm run dev
```

Turn on log of specific module:

```bash
$ DEBUG=egg* npm run dev
```

Detail logs of unit testing progress are able to be viewed via `DEBUG=* npm test`.

### Debug With egg-bin

#### Add Script

Add `npm scripts` into `package.json`：

```json
{
  "scripts": {
    "debug": "egg-bin debug"
  }
}
```

And then we may set breakpoints for debugging our app via `npm run debug`.

`egg-bin` will select debug protocol automatically. [Inspector Protocol] will be selected for version 8.x or higher. For version lower than 8.x, it will select [Legacy Protocol].

In the meantime, it supports custom debug parameters.

```bash
$ egg-bin debug --inpsect=9229
```

- Debug port of `master` is 9229 or 5858 (Legacy Protocol).
- Debug port of `agent` is fixed to 5800, it is customizable via `process.env.EGG_AGENT_DEBUG_PORT`.
- Debug port number of `worker` will increase from `master` port number.
- During developing period, worker will be hot reloaded once code changed, which will cause debug port to be self incrementing. Please refer to the following IDE configuration for auto-reconnecting.

#### Config Environment

App is also started by `env: local` when executing `debug` command. The configuration being read is an object combined from `config.local.js` and `config.unittest.js` files.

#### Debug With [DevTools] 

The latest DevTools only supports [Inspector Protocol]. Thus you will need to install Node.js 8.x or higher verions to be able to use it.

Execute `npm run debug` to start it:

```bash
➜  showcase git:(master) ✗ npm run debug

> showcase@1.0.0 debug /Users/tz/Workspaces/eggjs/test/showcase
> egg-bin debug

Debugger listening on ws://127.0.0.1:9229/f8258ca6-d5ac-467d-bbb1-03f59bcce85b
For help see https://nodejs.org/en/docs/inspector
2017-09-14 16:01:35,990 INFO 39940 [master] egg version 1.8.0
Debugger listening on ws://127.0.0.1:5800/bfe1bf6a-2be5-4568-ac7d-69935e0867fa
For help see https://nodejs.org/en/docs/inspector
2017-09-14 16:01:36,432 INFO 39940 [master] agent_worker#1:39941 started (434ms)
Debugger listening on ws://127.0.0.1:9230/2fcf4208-4571-4968-9da0-0863ab9f98ae
For help see https://nodejs.org/en/docs/inspector
9230 opened
Debug Proxy online, now you could attach to 9999 without worry about reload.
DevTools → chrome-devtools://devtools/bundled/inspector.html?experiments=true&v8only=true&ws=127.0.0.1:9999/__ws_proxy__
```

And then choose one of the following ways:
- Visit the `DevTools` URL printed in the last few lines in console directly. Since this URL is proxied from worker, you don't need to worry about restarting.
- Open `chrome://inspect`, and config port accordingly, then click `Open dedicated DevTools for Node` to open debug console.

![DevTools](https://user-images.githubusercontent.com/227713/30419047-a54ac592-9967-11e7-8a05-5dbb82088487.png)

#### Debug With WebStorm

`egg-bin` will read environment variable `$NODE_DEBUG_OPTION` set in WebStorm debug mode.

Start npm debug in WebStorm：

![WebStorm](https://user-images.githubusercontent.com/227713/30423086-5dd32ac6-9974-11e7-840f-904e49a97694.png)

#### Debug With [VSCode]

There are 2 ways:

1st method: open settings in VSCode, turn on `Debug: Toggle Auto Attach`, and then execute `npm run debug` in Terminal.

2nd method: setup `.vscode/launch.json` in VSCode, and then simply start with F5 key. (Note that this method will need to turn off the settings metioned in the 1st method).

```js
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Launch Egg",
      "type": "node",
      "request": "launch",
      "cwd": "${workspaceRoot}",
      "runtimeExecutable": "npm",
      "windows": { "runtimeExecutable": "npm.cmd" },
      "runtimeArgs": [ "run", "debug", "--", "--inspect-brk" ],
      "console": "integratedTerminal",
      "protocol": "auto",
      "restart": true,
      "port": 9229,
      "autoAttachChildProcesses": true
    }
  ]
}
```

And we offer a [vscode-eggjs] extention to setup auto-matically.

![VSCode](https://user-images.githubusercontent.com/227713/35954428-7f8768ee-0cc4-11e8-90b2-67e623594fa1.png)


For more options of setting up debug in VSCode, please refer to [Node.js Debugging in VS Code](https://code.visualstudio.com/docs/nodejs/nodejs-debugging).

## More

If you would like to know more about local development, like customizing a local development tool, please refer to [egg-bin].

[glob]: https://www.npmjs.com/package/glob
[egg-bin]: https://github.com/eggjs/egg-bin
[VSCode]: https://code.visualstudio.com
[Legacy Protocol]: https://github.com/buggerjs/bugger-v8-client/blob/master/PROTOCOL.md
[Inspector Protocol]: https://chromedevtools.github.io/debugger-protocol-viewer/v8
[DevTools]: https://developer.chrome.com/devtools
[WebStorm]: https://www.jetbrains.com/webstorm/
[vscode-eggjs]: https://github.com/eggjs/vscode-eggjs
