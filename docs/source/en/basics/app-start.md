# Application Startup Configuration

When the application starts up, we often need to set up some initialization logic. The application bootstraps with those specific configurations. It is in a healthy state and be able to take external service requests after those configurations successfully applied. Otherwise, it failed.

The framework starts with a file called `app.js` that executes the application initialization logic, if present, and it returns a function.

For example, we need to load a list of national cities from the remote server during application startup for subsequent use in the controller:

```js
// app.js
module.exports = app => {
  app.beforeStart(async () => {
    // The lifecycle method runs before the application bootstraps
    app.cities = await app.curl('http://example.com/city.json', {
      method: 'GET',
      dataType: 'json',
    });

    // also could create an anonymous context to call Service
    // const ctx = app.createAnonymousContext();
    // app.cities = await ctx.service.cities.load();
  });
};
```

`cities` attribute has attached on the global `app`. It can be accessed in the controller,

```js
// app/controller/home.js
class HomeController extends Controller {
  async index() {
    // now you can use `ctx.app.cities`
  }
}
```

**Note: When the framework executes the lifecycle method `beforeStart`, do not run time-consuming operation. The framework enables a *Timeout* setting by default when it starts up.**
