# Application Startup Configuration

When the application starts up, we often need to set up some initialization logic. The application bootstraps with those specific configurations. It is in a healthy state and be able to take external service requests after those configurations successfully applied. Otherwise, it failed.

## Application Customization

During the application bootstrapping time, the Framework loads up environment files, service files, route files, plugin files and many more. After the startup task is finished, it executes the application initialization logic at file location of `app/init.js` if present.

For example, we need to load a list of national cities from the remote server during application startup for subsequent use in the controller:

```js
// app/init.js
module.exports = function*(app) {
  app.cities = yield app.curl('http://example.com/city.json', {
    method: 'GET',
    dataType: 'json',
  });
};
```

`cities` attribute has attached on the global `this.app`. It can be accessed in the controller,

```js
// app/controller/city.js
module.exports = function*() {
  // this.app.cities // access `cities` property on the global `this.app`
}
```

## Plugins Customization

The framework provides the `app.js` file on purpose for plugins initialization. It is very similar to `init.js`, except that `app.js` is loaded before `init.js`. To understand the loading order, please see [loader documentation](../advanced/loader.md) for details.