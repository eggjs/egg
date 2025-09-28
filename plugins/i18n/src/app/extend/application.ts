import { debuglog, format } from 'node:util';

import { Application } from 'egg';

import { isObject } from '../../utils.ts';

const debug = debuglog('egg/i18n/app/extend/application');

export const I18N_RESOURCES = Symbol('Application i18n resources');

export default class I18nApplication extends Application {
  declare [I18N_RESOURCES]: Record<string, Record<string, string>>;

  isSupportLocale(locale: string) {
    return !!this[I18N_RESOURCES][locale];
  }

  gettext(locale: string, key: string, value?: any, ...args: any[]) {
    if (!locale || !key) {
      // __()
      // __('en')
      return '';
    }

    const resource = this[I18N_RESOURCES][locale] || {};

    let text = resource[key];
    if (text === undefined) {
      text = key;
    }

    debug('%s: %j => %j', locale, key, text);
    if (!text) {
      return '';
    }

    if (value === undefined) {
      // __(locale, key)
      return text;
    }
    if (args.length === 0) {
      if (isObject(value)) {
        // __(locale, key, object)
        // __('zh', '{a} {b} {b} {a}', {a: 'foo', b: 'bar'})
        // =>
        // foo bar bar foo
        return formatWithObject(text, value);
      }

      if (Array.isArray(value)) {
        // __(locale, key, array)
        // __('zh', '{0} {1} {1} {0}', ['foo', 'bar'])
        // =>
        // foo bar bar foo
        return formatWithArray(text, value);
      }

      // __(locale, key, value)
      return format(text, value);
    }

    // __(locale, key, value1, ...)
    return format(text, value, ...args);
  }

  __(locale: string, key: string, value?: any, ...args: any[]) {
    return this.gettext(locale, key, value, ...args);
  }
}

declare module 'egg' {
  interface Application {
    isSupportLocale(locale: string): boolean;
    gettext(locale: string, key: string, value?: any, ...args: any[]): string;
    __(locale: string, key: string, value?: any, ...args: any[]): string;
  }
}

const ARRAY_INDEX_RE = /\{(\d+)\}/g;
function formatWithArray(text: string, values: any[]) {
  return text.replace(ARRAY_INDEX_RE, (original, matched) => {
    const index = parseInt(matched);
    if (index < values.length) {
      return values[index];
    }
    // not match index, return original text
    return original;
  });
}

const Object_INDEX_RE = /\{(.+?)\}/g;
function formatWithObject(text: string, values: Record<string, any>) {
  return text.replace(Object_INDEX_RE, (original, matched) => {
    const value = values[matched];
    if (value) {
      return value;
    }
    // not match index, return original text
    return original;
  });
}
