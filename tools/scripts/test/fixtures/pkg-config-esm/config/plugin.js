export default {
  // enable plugins

  /**
   * app global Error Handling
   * @member {Object} Plugin#onerror
   * @property {Boolean} enable - `true` by default
   */
  onerror: {
    enable: false,
    package: 'egg-onerror',
    path: 'xxxxx',
  },

  /**
   * session
   * @member {Object} Plugin#session
   * @property {Boolean} enable - `true` by default
   * @since 1.0.0
   */
  session: {
    enable: false,
    package: 'egg-session',
    path: 'xxxxx',
  },

  /**
   * i18n
   * @member {Object} Plugin#i18n
   * @property {Boolean} enable - `true` by default
   * @since 1.0.0
   */
  i18n: {
    enable: false,
    package: 'egg-i18n',
    path: 'xxxxx',
  },

  /**
   * file and dir watcher
   * @member {Object} Plugin#watcher
   * @property {Boolean} enable - `true` by default
   * @since 1.0.0
   */
  watcher: {
    enable: false,
    package: 'egg-watcher',
    path: 'xxxxx',
  },

  /**
   * multipart
   * @member {Object} Plugin#multipart
   * @property {Boolean} enable - `true` by default
   * @since 1.0.0
   */
  multipart: {
    enable: false,
    package: 'egg-multipart',
    path: 'xxxxx',
  },

  /**
   * security middlewares and extends
   * @member {Object} Plugin#security
   * @property {Boolean} enable - `true` by default
   * @since 1.0.0
   */
  security: {
    enable: false,
    package: 'egg-security',
    path: 'xxxxx',
  },

  /**
   * local development helper
   * @member {Object} Plugin#development
   * @property {Boolean} enable - `true` by default
   * @since 1.0.0
   */
  development: {
    enable: false,
    package: 'egg-development',
    path: 'xxxxx',
  },

  /**
   * logger file rotator
   * @member {Object} Plugin#logrotator
   * @property {Boolean} enable - `true` by default
   * @since 1.0.0
   */
  logrotator: {
    enable: false,
    package: 'egg-logrotator',
    path: 'xxxxx',
  },

  /**
   * schedule tasks
   * @member {Object} Plugin#schedule
   * @property {Boolean} enable - `true` by default
   * @since 2.7.0
   */
  schedule: {
    enable: false,
    package: 'egg-schedule',
    path: 'xxxxx',
  },

  /**
   * `app/public` dir static serve
   * @member {Object} Plugin#static
   * @property {Boolean} enable - `true` by default
   * @since 1.0.0
   */
  static: {
    enable: false,
    package: 'egg-static',
    path: 'xxxxx',
  },

  /**
   * jsonp support for egg
   * @member {Function} Plugin#jsonp
   * @property {Boolean} enable - `true` by default
   * @since 1.0.0
   */
  jsonp: {
    enable: false,
    package: 'egg-jsonp',
    path: 'xxxxx',
  },

  /**
   * view plugin
   * @member {Function} Plugin#view
   * @property {Boolean} enable - `true` by default
   * @since 1.0.0
   */
  view: {
    enable: false,
    package: 'egg-view',
    path: 'xxxxx',
  },
};
