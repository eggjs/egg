'use strict';

const path = require('path');
const BaseLoader = require('egg-loader');
const Router = require('../router');

/**
 * App Worker process Loader, will load plugins
 * @see https://github.com/eggjs/egg-loader
 */
class AppWorkerLoader extends BaseLoader {

  constructor(options) {
    options.eggPath = path.join(__dirname, '../../..');
    super(options);
  }

  /**
   * loadPlugin first, then loadConfig
   * @since 1.0.0
   */
  loadConfig() {
    super.loadPlugin();
    super.loadConfig();
  }

  /**
   * 开始加载所有约定目录
   * @since 1.0.0
   */
  load() {
    // app > plugin > core
    this.loadRequest();
    this.loadResponse();
    this.loadContext();
    this.loadHelper();

    // app > plugin
    this.loadCustomApp();
    // app > plugin
    this.loadService();
    // app > plugin > core
    this.loadMiddleware();
    // app
    this.loadController();
    // app
    this.loadRouter(); // 依赖 controller
  }

  /**
   * 加载 config/router.js
   * @since 1.0.0
   */
  loadRouter() {
    const app = this.app;
    const router = new Router({ sensitive: true }, app);

    // 注册 Router 的 Middleware
    app.use(router.middleware());

    // 加载 router.js
    this.loadFile(path.join(app.config.baseDir, 'app/router.js'));
  }

}

module.exports = AppWorkerLoader;
