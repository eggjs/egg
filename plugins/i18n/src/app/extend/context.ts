import { debuglog } from 'node:util';

import { Context } from 'egg';

import { formatLocale } from '../../utils.ts';

const debug = debuglog('egg/i18n/app/extend/context');

export default class I18nContext extends Context {
  /**
   * get current request locale
   * @member Context#locale
   * @return {String} lower case locale string, e.g.: 'zh-cn', 'en-us'
   */
  get locale(): string {
    return this.__getLocale();
  }

  set locale(l: string) {
    this.__setLocale(l);
  }

  /**
   * `ctx.__` 的别名。
   * @see {@link Context#__}
   * @function Context#gettext
   */
  gettext(key: string, value?: any, ...args: any[]) {
    return this.app.gettext(this.locale, key, value, ...args);
  }

  /**
   * 如果开启了 I18n 多语言功能，那么会出现此 API，通过它可以获取到当前请求对应的本地化数据。
   *
   * 详细使用说明，请查看 {@link I18n}
   * - `ctx.__ = function (key, value[, value2, ...])`: 类似 `util.format` 接口
   * - `ctx.__ = function (key, values)`: 支持数组下标占位符方式，如
   * - `__` 的别名是 `gettext(key, value)`
   *
   * > NOTE: __ 是两个下划线哦！
   * @function Context#__
   * @example
   * ```js
   * ctx.__('{0} {0} {1} {1}'), ['foo', 'bar'])
   * ctx.gettext('{0} {0} {1} {1}'), ['foo', 'bar'])
   * =>
   * foo foo bar bar
   * ```
   * ##### Controller 下的使用示例
   *
   * ```js
   * module.exports = function* () {
   *   this.body = {
   *     message: this.__('Welcome back, %s!', this.user.name),
   *     // 或者使用 gettext，如果觉得 __ 不好看的话
   *     // message: this.gettext('Welcome back, %s!', this.user.name),
   *     user: this.user,
   *   };
   * };
   * ```
   *
   * ##### View 文件下的使用示例
   *
   * ```html
   * <li>{{ __('Email') }}: {{ user.email }}</li>
   * <li>
   *   {{ __('Hello %s, how are you today?', user.name) }}
   * </li>
   * <li>
   *   {{ __('{0} {0} {1} {1}'), ['foo', 'bar']) }}
   * </li>
   * ```
   *
   * ##### locale 参数获取途径
   *
   * 优先级从上到下：
   *
   * - query: `/?locale=en-US`
   * - cookie: `locale=zh-TW`
   * - header: `Accept-Language: zh-CN,zh;q=0.5`
   */
  __(key: string, value?: any, ...args: any[]) {
    return this.gettext(key, value, ...args);
  }

  declare __locale: string;
  // 1. query: /?locale=en-US
  // 2. cookie: locale=zh-TW
  // 3. header: Accept-Language: zh-CN,zh;q=0.5
  __getLocale(): string {
    if (this.__locale) {
      return this.__locale;
    }

    const { localeAlias, defaultLocale, cookieField, queryField, writeCookie } = this.app.config.i18n;
    const cookieLocale = this.cookies.get(cookieField, { signed: false });

    // 1. Query
    let locale = this.query[queryField] as string;
    let localeOrigin = 'query';

    // 2. Cookie
    if (!locale && cookieLocale) {
      locale = cookieLocale;
      localeOrigin = 'cookie';
    }

    // 3. Header
    if (!locale) {
      // Accept-Language: zh-CN,zh;q=0.5
      // Accept-Language: zh-CN
      let languages = this.acceptsLanguages();
      if (languages) {
        if (Array.isArray(languages)) {
          if (languages[0] === '*') {
            languages = languages.slice(1);
          }
          if (languages.length > 0) {
            for (const l of languages) {
              const lang = formatLocale(l);
              if (this.app.isSupportLocale(lang) || localeAlias[lang]) {
                locale = lang;
                localeOrigin = 'header';
                break;
              }
            }
          }
        } else {
          locale = languages;
          localeOrigin = 'header';
        }
      }

      // all missing, set it to defaultLocale
      if (!locale) {
        locale = defaultLocale;
        localeOrigin = 'default';
      }
    }

    // cookie alias
    if (locale in localeAlias) {
      const originalLocale = locale;
      locale = localeAlias[locale];
      debug('Used alias, received %s but using %s', originalLocale, locale);
    }

    locale = formatLocale(locale);

    // validate locale
    if (!this.app.isSupportLocale(locale)) {
      debug('Locale %s is not supported. Using default (%s)', locale, defaultLocale);
      locale = defaultLocale;
    }

    // if header not send, set the locale cookie
    if (writeCookie && cookieLocale !== locale && !this.headerSent) {
      updateCookie(this, locale);
    }
    debug('Locale: %s from %s', locale, localeOrigin);
    this.__locale = locale;
    this.__localeOrigin = localeOrigin;
    return locale;
  }

  declare __localeOrigin: string;
  __getLocaleOrigin() {
    if (this.__localeOrigin) {
      return this.__localeOrigin;
    }
    this.__getLocale();
    return this.__localeOrigin;
  }

  __setLocale(locale: string) {
    this.__locale = locale;
    this.__localeOrigin = 'set';
    if (this.app.config.i18n.writeCookie && !this.headerSent) {
      updateCookie(this, locale);
    }
  }
}

function updateCookie(ctx: Context, locale: string) {
  const { cookieMaxAge, cookieField, cookieDomain } = ctx.app.config.i18n;
  const cookieOptions = {
    // make sure browser javascript can read the cookie
    httpOnly: false,
    maxAge: cookieMaxAge as number,
    signed: false,
    domain: cookieDomain,
    overwrite: true,
  };
  ctx.cookies.set(cookieField, locale, cookieOptions);
  debug('Saved cookie with locale %s, options: %j', locale, cookieOptions);
}
