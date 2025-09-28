export function isObject(obj: any) {
  return Object.prototype.toString.call(obj) === '[object Object]';
}

export function formatLocale(locale: string) {
  // support zh_CN, en_US, zh_Hans_CN, zh_Hant_CN => zh-CN, en-US, zh-hans-cn, zh-hant-cn
  return locale.replaceAll('_', '-').toLowerCase();
}
