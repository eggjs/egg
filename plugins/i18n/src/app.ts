import path from 'node:path';
import { debuglog } from 'node:util';

import { exists } from 'utility';
import { ms } from 'humanize-ms';
import type { ILifecycleBoot, Application } from 'egg';

import { loadLocaleResources } from './locales.ts';
import { formatLocale } from './utils.ts';

const debug = debuglog('egg/i18n/app');

/**
 * I18n 国际化
 *
 * 通过设置 Plugin 配置 `i18n: true`，开启多语言支持。
 *
 * #### 语言文件存储路径
 *
 * 统一存放在 `config/locale/*.js` 下（ 兼容`config/locales/*.js` ），如包含英文，简体中文，繁体中文的语言文件：
 *
 * ```
 * - config/locale/
 *   - en-US.js
 *   - zh-CN.js
 *   - zh-TW.js
 * ```
 * @class I18n
 * @param {App} app Application object.
 * @example
 *
 * #### I18n 文件内容
 *
 * ```js
 * // config/locale/zh-CN.js
 * module.exports = {
 *   "Email": "邮箱",
 *   "Welcome back, %s!": "欢迎回来, %s!",
 *   "Hello %s, how are you today?": "你好 %s, 今天过得咋样？",
 * };
 * ```
 *
 * ```js
 * // config/locale/en-US.js
 * module.exports = {
 *   "Email": "Email",
 * };
 * ```
 * 或者也可以用 JSON 格式的文件:
 *
 * ```js
 * // config/locale/zh-CN.json
 * {
 *   "email": "邮箱",
 *   "login": "帐号",
 *   "createdAt": "注册时间"
 * }
 * ```
 */

export default class I18n implements ILifecycleBoot {
  private readonly app;

  constructor(app: Application) {
    this.app = app;
  }

  async didLoad() {
    const i18nConfig = this.app.config.i18n;
    i18nConfig.defaultLocale = formatLocale(i18nConfig.defaultLocale);
    i18nConfig.cookieMaxAge = ms(i18nConfig.cookieMaxAge);

    i18nConfig.dirs = Array.isArray(i18nConfig.dirs) ? i18nConfig.dirs : [];
    // 按 egg > 插件 > 框架 > 应用的顺序遍历 config/locale(config/locales) 目录，加载所有配置文件
    for (const unit of this.app.loader.getLoadUnits()) {
      let localePath = path.join(unit.path, 'config/locale');
      /**
       * 优先选择 `config/locale` 目录下的多语言文件，不存在时再选择 `config/locales` 目录
       * 避免 2 个目录同时存在时可能导致的冲突
       */
      if (!(await exists(localePath))) {
        localePath = path.join(unit.path, 'config/locales');
      }
      i18nConfig.dirs.push(localePath);
    }

    debug('app.config.i18n.dirs:', i18nConfig.dirs);

    await loadLocaleResources(this.app, i18nConfig);

    const app = this.app;
    function gettextInContext(key: string, ...args: any[]) {
      const ctx = app.ctxStorage.getStore()!;
      return ctx.gettext(key, ...args);
    }
    // 在 view 中使用 `__(key, value, ...args)`
    Object.defineProperties(app.locals, {
      __: {
        value: gettextInContext,
        enumerable: true,
      },
      gettext: {
        value: gettextInContext,
        enumerable: true,
      },
    });
  }
}
