import developmentPlugin from '@eggjs/development';
import i18nPlugin from '@eggjs/i18n';
import jsonpPlugin from '@eggjs/jsonp';
import logrotatorPlugin from '@eggjs/logrotator';
import multipartPlugin from '@eggjs/multipart';
import onerrorPlugin from '@eggjs/onerror';
import schedulePlugin from '@eggjs/schedule';
import securityPlugin from '@eggjs/security';
import sessionPlugin from '@eggjs/session';
import staticPlugin from '@eggjs/static';
import viewPlugin from '@eggjs/view';
import watcherPlugin from '@eggjs/watcher';

import type { EggPluginItem } from '../index.ts';

const enableTeggPlugins = process.env.DISABLE_TEGG_PLUGINS !== 'true';

const plugins: Record<string, EggPluginItem> = {
  /**
   * app global Error Handling
   * @member {Object} Plugin#onerror
   * @property {Boolean} enable - `true` by default
   */
  ...onerrorPlugin(),

  /**
   * session
   * @member {Object} Plugin#session
   * @property {Boolean} enable - `true` by default
   * @since 1.0.0
   */
  ...sessionPlugin(),

  /**
   * i18n
   * @member {Object} Plugin#i18n
   * @property {Boolean} enable - `true` by default
   * @since 1.0.0
   */
  ...i18nPlugin(),

  /**
   * file and dir watcher
   * @member {Object} Plugin#watcher
   * @property {Boolean} enable - `true` by default
   * @since 1.0.0
   */
  ...watcherPlugin(),

  /**
   * multipart
   * @member {Object} Plugin#multipart
   * @property {Boolean} enable - `true` by default
   * @since 1.0.0
   */
  ...multipartPlugin(),

  /**
   * security middlewares and extends
   * @member {Object} Plugin#security
   * @property {Boolean} enable - `true` by default
   * @since 1.0.0
   */
  ...securityPlugin(),

  ...developmentPlugin(),

  /**
   * logger file rotator
   * @member {Object} Plugin#logrotator
   * @property {Boolean} enable - `true` by default
   * @since 1.0.0
   */
  ...logrotatorPlugin(),

  /**
   * schedule tasks
   * @member {Object} Plugin#schedule
   * @property {Boolean} enable - `true` by default
   * @since 2.7.0
   */
  ...schedulePlugin(),

  /**
   * `app/public` dir static serve
   * @member {Object} Plugin#static
   * @property {Boolean} enable - `true` by default
   * @since 1.0.0
   */
  ...staticPlugin(),

  /**
   * jsonp support for egg
   * @member {Function} Plugin#jsonp
   * @property {Boolean} enable - `true` by default
   * @since 1.0.0
   */
  ...jsonpPlugin(),

  /**
   * view plugin
   * @member {Function} Plugin#view
   * @property {Boolean} enable - `true` by default
   * @since 1.0.0
   */
  ...viewPlugin(),

  // tegg plugins
  teggConfig: {
    enable: enableTeggPlugins,
    package: '@eggjs/tegg-config',
  },
  tegg: {
    enable: enableTeggPlugins,
    package: '@eggjs/tegg-plugin',
  },
  teggAjv: {
    enable: enableTeggPlugins,
    package: '@eggjs/ajv-plugin',
  },
  teggAop: {
    enable: enableTeggPlugins,
    package: '@eggjs/aop-plugin',
  },
  teggController: {
    enable: enableTeggPlugins,
    package: '@eggjs/controller-plugin',
  },
  teggDal: {
    enable: enableTeggPlugins,
    package: '@eggjs/dal-plugin',
  },
  // FIXME: AgentWorkerLoader.requireFile() load file: ~/tegg/plugin/eventbus/src/app/extend/context.ts, error: Invalid or unexpected token on worker_threads mode
  teggEventbus: {
    // FIXME: MultiPrototypeFound: multi proto found for name:eventContextFactory and qualifiers [{"value":"SINGLETON"}] [ https://eggjs.org/faq/TEGG_MULTI_PROTO_FOUND ]
    enable: enableTeggPlugins,
    package: '@eggjs/eventbus-plugin',
  },
  teggOrm: {
    enable: enableTeggPlugins,
    package: '@eggjs/orm-plugin',
  },
  teggSchedule: {
    enable: enableTeggPlugins,
    package: '@eggjs/schedule-plugin',
  },
};

export default plugins;
