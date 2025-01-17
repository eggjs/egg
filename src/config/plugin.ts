export default {
  /**
   * app global Error Handling
   * @member {Object} Plugin#onerror
   * @property {Boolean} enable - `true` by default
   */
  onerror: {
    enable: true,
    package: 'egg-onerror',
  },

  /**
   * session
   * @member {Object} Plugin#session
   * @property {Boolean} enable - `true` by default
   * @since 1.0.0
   */
  session: {
    enable: true,
    package: 'egg-session',
  },

  /**
   * i18n
   * @member {Object} Plugin#i18n
   * @property {Boolean} enable - `true` by default
   * @since 1.0.0
   */
  i18n: {
    enable: true,
    package: '@eggjs/i18n',
  },

  /**
   * file and dir watcher
   * @member {Object} Plugin#watcher
   * @property {Boolean} enable - `true` by default
   * @since 1.0.0
   */
  watcher: {
    enable: true,
    package: '@eggjs/watcher',
  },

  /**
   * multipart
   * @member {Object} Plugin#multipart
   * @property {Boolean} enable - `true` by default
   * @since 1.0.0
   */
  multipart: {
    enable: true,
    package: 'egg-multipart',
  },

  /**
   * security middlewares and extends
   * @member {Object} Plugin#security
   * @property {Boolean} enable - `true` by default
   * @since 1.0.0
   */
  security: {
    enable: true,
    package: '@eggjs/security',
  },

  /**
   * local development helper
   * @member {Object} Plugin#development
   * @property {Boolean} enable - `true` by default
   * @since 1.0.0
   */
  development: {
    enable: true,
    package: '@eggjs/development',
  },

  /**
   * logger file rotator
   * @member {Object} Plugin#logrotator
   * @property {Boolean} enable - `true` by default
   * @since 1.0.0
   */
  logrotator: {
    enable: true,
    package: 'egg-logrotator',
  },

  /**
   * schedule tasks
   * @member {Object} Plugin#schedule
   * @property {Boolean} enable - `true` by default
   * @since 2.7.0
   */
  schedule: {
    enable: true,
    package: '@eggjs/schedule',
  },

  /**
   * `app/public` dir static serve
   * @member {Object} Plugin#static
   * @property {Boolean} enable - `true` by default
   * @since 1.0.0
   */
  static: {
    enable: true,
    package: '@eggjs/static',
  },

  /**
   * jsonp support for egg
   * @member {Function} Plugin#jsonp
   * @property {Boolean} enable - `true` by default
   * @since 1.0.0
   */
  jsonp: {
    enable: true,
    package: '@eggjs/jsonp',
  },

  /**
   * view plugin
   * @member {Function} Plugin#view
   * @property {Boolean} enable - `true` by default
   * @since 1.0.0
   */
  view: {
    enable: true,
    package: 'egg-view',
  },
};
