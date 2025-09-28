import type { I18nConfig } from './config/config.default.ts';

declare module 'egg' {
  // add EggAppConfig overrides types
  interface EggAppConfig {
    /**
     * I18n options
     * @member Config#i18n
     */
    i18n: I18nConfig;
  }

  interface Application {
    isSupportLocale(locale: string): boolean;
    gettext(locale: string, key: string, value?: any, ...args: any[]): string;
    __(locale: string, key: string, value?: any, ...args: any[]): string;
  }

  interface Context {
    /**
     * get and set current request locale
     * @member Context#locale
     * @return {String} lower case locale string, e.g.: 'zh-cn', 'en-us'
     */
    locale: string;

    gettext(key: string, value?: any, ...args: any[]): string;
    __(key: string, value?: any, ...args: any[]): string;

    __getLocale(): string;
    __setLocale(l: string): void;
  }
}
