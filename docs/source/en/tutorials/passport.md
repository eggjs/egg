## Title: Passport

**`Login authentication`** is a common business scenario, including "account password login method" and "third-party unified login".

Among them, we often use the latter, such as Google, GitHub, QQ unified login, which are based on [OAuth](https://oauth.net/2/) specification.

[Passport](http://www.passportjs.org/) is a highly scalable authentication middleware that supports the `Strategy` of `Github` ,`Twitter`,`Facebook`, and other well-known service vendors. It also supports login and authorization verification via account passwords.

Egg provides an [egg-passport](https://github.com/eggjs/egg-passport) plugin on top of it, encapsulating general logic such as callback processing after initialization and authentication success, allowing the developer to use Passport with just a few API calls.

The execution sequence of [Passport](http://www.passportjs.org/) is as follows:

* User access page
* Check Session
* Intercept the login authentication login page
* Strategy Authentication
* Checksum storage of user information
* Serialize user information to Session
* Jump to the specified page

## Using egg-passport

Below, we will use GitHub login as an example to demonstrate how to use it.

### Installation

```bash
$ npm i --save egg-passport
$ npm i --save egg-passport-github
```

For more plugins, see [GitHub Topic - egg-passport](https://github.com/topics/egg-passport) .

### Configuration

**Enabling the plugin:**

```js
// config/plugin.js
Exports.passport = {
  Enable: true,
  Package: 'egg-passport'
};

exports.passportGithub = {
  Enable: true,
  Package: 'egg-passport-github'
};
```

**Configuration:**

Note: The [egg-passport](https://github.com/eggjs/egg-passport) standardizes the configuration fields, which are unified as `key` and `secret`.

```js
// config/default.js
config.passportGithub = {
  Key: 'your_clientID',
  Secret: 'your_clientSecret'
};
```

**note:**

* Create a [GitHub OAuth App](https://github.com/settings/applications/new) to get the `clientID` and `clientSecret` information.
* Specify a `callbackURL`, such as `http://127.0.0.1:7001/passport/github/callback`
    - You need to update to the corresponding domain name when deploying online
    - The path is configured via `options.callbackURL`, which defaults to `/passport/${strategy}/callback`

### Mounting Routes

```js
// app/router.js
Module.exports = app => {
  Const { router, controller } = app;

  // Mount the authentication route
  App.passport.mount('github');

  // The mount above is syntactic sugar, which is equivalent to
  // const github = app.passport.authenticate('github', {});
  // router.get('/passport/github', github);
  // router.get('/passport/github/callback', github);
}
```

### User Information Processing

Then we also need:

* When logging in for the first time, you generally need to put user information into the repository and record the Session.
* In the second login, the user information obtained from OAuth or Session, and the database is read to get the complete user information.

```js
// app.js
Module.exports = app => {
  App.passport.verify(async (ctx, user) => {
    // Check user
    Assert(user.provider, 'user.provider should exists');
    Assert(user.id, 'user.id should exists');

    // Find user information from the database
    //
    // Authorization Table
    // column   | desc
    // ---      | --
    // provider | provider name, like github, twitter, facebook, weibo and so on
    // uid      | provider unique id
    // user_id  | current application user id
    Const auth = await ctx.model.Authorization.findOne({
      Uid: user.id,
      Provider: user.provider,
    });
    Const existsUser = await ctx.model.User.findOne({ id: auth.user_id });
    If (existsUser) {
      Return existsUser;
    }
    // Call service to register a new user
    Const newUser = await ctx.service.user.register(user);
    Return newUser;
  });

  // Serialize and store the user information into session. Generally, only a few fields need to be streamlined/saved.
  app.passport.serializeUser(async (ctx, user) => {
  // process user
  // ...
  // return user;
  });

  // Deserialize the user information from the session, check the database to get the complete information
  app.passport.deserializeUser(async (ctx, user) => {
  // process user
  // ...
  // return user;
  });
};
```

At this point, we have completed all the configurations. For a complete example, see: [eggjs/examples/passport](https://github.com/eggjs/examples/tree/master/passport)

### API

[egg-passport](https://github.com/eggjs/egg-passport) provides the following extensions:

* `ctx.user` - Get currently logged in user information
* `ctx.isAuthenticated()` - Check if the request is authorized
* `ctx.login(user, [options])` - Start a login session for the user
* `ctx.logout()` - Exit and clear user information from session
* `ctx.session.returnTo=` - Set redirect address after success before jumping to authentication

The API also provides:

* `app.passport.verify(async (ctx, user) => {})` - Check user
* `app.passport.serializeUser(async (ctx, user) => {})` - Serialize user information into session
* `app.passport.deserializeUser(async (ctx, user) => {})` - Deserialize user information from the session
* `app.passport.authenticate(strategy, options)` - Generate the specified authentication middleware
    - `options.successRedirect` - specifies the redirect address after successful authentication
    - `options.loginURL` - jump login address, defaults to `/passport/${strategy}`
    - `options.callbackURL` - callback address after authorization, defaults to `/passport/${strategy}/callback`
* `app.passport.mount(strategy, options)` - Syntactic sugar for developers to configure routing

## Using Passport Ecosystem

[Passport](http://www.passportjs.org/) has many middleware and it is impossible to carry out secondary packaging.
Next, let's look at how to use Passport middleware directly in the framework.
We will use [passport-local](https://github.com/jaredhanson/passport-local) for "account password login" as an example:

### Installation

```bash
$ npm i --save passport-local
```

### Configuration

```js
// app.js
Const LocalStrategy = require('passport-local').Strategy;

Module.exports = app => {
  // Mount strategy
  App.passport.use(new LocalStrategy({
    passReqToCallback: true,
  }, (req, username, password, done) => {
    // format user
    Const user = {
      Provider: 'local',
      Username,
      Password,
    };
    Debug('%s %s get user: %j', req.method, req.url, user);
    app.passport.doVerify(req, user, done);
  }));

  // Process user information
  App.passport.verify(async (ctx, user) => {});
  app.passport.serializeUser(async (ctx, user) => {});
  app.passport.deserializeUser(async (ctx, user) => {});
};
```

### Mounting Routes

```js
// app/router.js
Module.exports = app => {
  Const { router, controller } = app;
  Router.get('/', controller.home.index);

  // Callback page after successful authentication
  Router.get('/authCallback', controller.home.authCallback);

  // Render login page, user input account password
  Router.get('/login', controller.home.login);
  // Login verification
  Router.post('/login', app.passport.authenticate('local', { successRedirect: '/authCallback' }));
};
```

## How to develop an egg-passport plugin

In the previous section, we learned how to use a Passport middleware in the framework. We can further package it as a plugin and give back to the community.

**initialization:**

```bash
$ egg-init --type=plugin egg-passport-local
```

**Configure dependencies in `package.json`:**

```json
{
  "name": "egg-passport-local",
  "version": "1.0.0",
  "eggPlugin": {
    "name": "passportLocal",
    "dependencies": ["passport"]
  },
  "dependencies": {
    "passport-local": "^1.0.0"
  }
}
```

**Configuration:**

```js
// {plugin_root}/config/config.default.js
// https://github.com/jaredhanson/passport-local
exports.passportLocal = {};
```

Note: [egg-passport](https://github.com/eggjs/egg-passport) standardizes the configuration fields, which are unified as `key` and `secret`, so if the corresponding Passport middleware attribute names are inconsistent, the developer should perform the conversion.

**Register the passport middleware:**

```js
// {plugin_root}/app.js
Const LocalStrategy = require('passport-local').Strategy;

Module.exports = app => {
  Const config = app.config.passportLocal;
  config.passReqToCallback = true;

  App.passport.use(new LocalStrategy(config, (req, username, password, done) => {
    // Cleans up the data returned by the Passport plugin and returns the User object
    Const user = {
      Provider: 'local',
      Username,
      Password,
    };
    // This does not process application-level logic and passes it to app.passport.verify for unified processing.
    app.passport.doVerify(req, user, done);
  }));
};
```

[passport]: http://www.passportjs.org/
[egg-passport]: https://github.com/eggjs/egg-passport
[passport-local]: https://github.com/jaredhanson/passport-local
[eggjs/examples/passport]: https://github.com/eggjs/examples/tree/master/passport
