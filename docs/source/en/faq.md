title: FAQ
---

If you have questions that is not contained below, please check [Egg issues](https://github.com/eggjs/egg/issues).

## How to feedback efficiently?

Thank you for reporting an issue.

1. It's RECOMMENDED to submit PR for typo or tiny bug fix.
2. If this's a FEATURE request, please provide: details, pseudo codes if necessary.
3. If this's a BUG, please provide: course repetition, error log and configuration. Fill in as much of the template below as you're able.
4. **It will be nice to use `egg-init --type=simple bug` to provide a mini GitHub repository which can reproduce the issue.**

Most importantly, please understand one thing: the relationship between the `user` and `the maintainer of open source project` is not `Buyer` and `Seller`, the issue is not a customer order either.
When you're opening an issue, please hold a mentality of "working together to solve this problem." Do not expect us to serve you unilaterally.

## Why my config don't work?

Framework [Config](./basics/config.md) settings is powerfull, support different environments and different places(framework, plugins, app).

When you got some trouble, and want to find out what is the final config using at runtime, you can checkout `${root}/run/application_config.json`(workers' configurations) and `${root}/run/agent_config.json`(agent's configurations).(`root` is application's root directory, in `local` and `unittest` environments, it will be project base directory, in other environments will be HOME directory)

Please make sure you don't make mistake like the code below:

```js
// config/config.default.js
exports.someKeys = 'abc';
module.exports = appInfo => {
  const config = {};
  config.keys = '123456';
  return config;
};
```

## Where are my log files in prod environment?

By default, logs will print at `${baseDir}/logs`(baseDir is project's base directory) in local environment.But in non-development environments(neither local nor unittest), the logs will print at `$HOME/logs`(such as `/home/admin/logs`). So the logs won't mix in during development and locate in the same place when run in production environment.

## Why not choose PM2 as process management tool?

1. PM2 itself is too complex to issue problems if any.
2. Deep optimization could be difficlut to achieve if choosing PM2.
3. Pattern like one leader process communicating with remote services, along with serveral follower processes delegating request to it ([Cluster](./core/cluster-and-ipc.md)), is a rigid demand for reducing connections and data exchange load, espeically when facing applications in very large scale. egg originates from Ant Financial Group and Alibaba Group, we start with applications in that scale at first, so we take these goals into consideration. All of these goals above could be hard to achieve with PM2.

Process management is very important. It defines the way we write code, meanwhile relates to deep runtime optimizations. So we think it's better included in framework itself.

**How to start application with PM2?**

Although PM2 is not recommanded, you can use it anyway.

Firstly, put a start file in the root directory of your project:

```js
// server.js
const egg = require('egg');

const workers = Number(process.argv[2] || require('os').cpus().length);
egg.startCluster({
  workers,
  baseDir: __dirname,
});
```

We can start application with PM2 like this:

```bash
pm2 start server.js
```

## How to resolve csrf error?

There are two kinds of common csrf errors:

- `missing csrf token`
- `invalid csrf token`

By default [egg-security](https://github.com/eggjs/egg-security/) plugin built in Egg requires CSRF validation against all 'unsafe' request such as `POST`, `PUT`, `DELETE` requests.

The error will disappear in the presence of correct csrf token in request. For more implentation details, see [./core/security.md#csrf].

## In local development environment, why is worker process not restarted automatically when files are modified?

Usually this happens when you are using Jetbrains softwares(IntelliJ IDEA, WebStorm, etc.) with `Safe Write` turned on.

According to Jetbrains [Safe Write document](https://www.jetbrains.com/help/webstorm/2016.3/system-settings.html):

> If this check box is selected, a changed file is first saved in a temporary file. If the save operation succeeds, the file being saved is replaced with the saved file. (Technically, the original file is deleted and the temporary file is renamed.)

Renaming files leads to file watching failure. The solution is simple: just turn of `Safe Write` option. (Settings | Appearance & Behavior | System Settings | Use "safe write", the path may vary in different versions)
