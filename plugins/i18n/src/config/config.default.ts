export interface I18nConfig {
  /**
   * 默认语言是美式英语，毕竟支持多语言，基本都是以英语为母板
   * 默认值是 `en_US`
   */
  defaultLocale: string;
  /**
   * 多语言资源文件存放路径，不建议修改
   * 默认值是 `[]`
   */
  dirs: string[];
  /**
   * @deprecated please use `dirs` instead
   */
  dir?: string;
  /**
   * 设置当前语言的 query 参数字段名，默认通过 `query.locale` 获取
   * 如果你想修改为 `query.lang`，那么请通过修改此配置实现
   * 默认值是 `locale`
   */
  queryField: string;
  /**
   * 如果当前请求用户语言有变化，都会设置到 cookie 中保持着，
   * 默认是存储在key 为 locale 的 cookie 中
   * 默认值是 `locale`
   */
  cookieField: string;
  /**
   * 存储 locale 的 cookie domain 配置，默认不设置，为当前域名才有效
   * 默认值是 `''`
   */
  cookieDomain: string;
  /**
   * cookie 默认一年后过期，如果设置为 Number，则单位为 ms
   * 默认值是 `'1y'`
   */
  cookieMaxAge: string | number;
  /**
   * locale 别名，比如 zh_CN => cn
   * 默认值是 `{}`
   */
  localeAlias: Record<string, string>;
  /**
   * 是否写入 cookie
   * 默认值是 `true`
   */
  writeCookie: boolean;
}

export default {
  i18n: {
    defaultLocale: 'en_US',
    dirs: [],
    queryField: 'locale',
    cookieField: 'locale',
    cookieDomain: '',
    cookieMaxAge: '1y',
    localeAlias: {},
    writeCookie: true,
    dir: undefined,
  } as I18nConfig,
};
