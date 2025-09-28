export function isObject(obj: any) {
  return Object.prototype.toString.call(obj) === '[object Object]';
}

export function formatLocale(locale: string) {
  // support zh_CN, en_US => zh-CN, en-US
  return locale.replace('_', '-').toLowerCase();
}
