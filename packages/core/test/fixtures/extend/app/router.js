'use strict';

module.exports = function (app) {
  app.get('/', app.controller.home);

  app.get('/merge/app_override_chair', app.controller.merge.appOverrideChair);
  app.get('/merge/app_override_plugin', app.controller.merge.appOverridePlugin);
  app.get(
    '/merge/plugin_override_chair',
    app.controller.merge.pluginOverrideChair
  );
};
