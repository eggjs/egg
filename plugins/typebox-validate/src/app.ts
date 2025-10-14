import type { Application, ILifecycleBoot } from 'egg';
import addFormats from 'ajv-formats';
import { Ajv2019 as Ajv } from 'ajv/dist/2019.js';
import keyWords from 'ajv-keywords';

const getAjvInstance = () => {
  const ajv = new Ajv();
  // @ts-expect-error - keyWords types are not fully compatible
  keyWords(ajv, 'transform');
  // @ts-expect-error - addFormats types are not fully compatible
  addFormats(ajv, [
    'date-time',
    'time',
    'date',
    'email',
    'hostname',
    'ipv4',
    'ipv6',
    'uri',
    'uri-reference',
    'uuid',
    'uri-template',
    'json-pointer',
    'relative-json-pointer',
    'regex',
  ])
    .addKeyword('kind')
    .addKeyword('modifier');
  return ajv;
};

export default class AppBootHook implements ILifecycleBoot {
  public app: Application;

  constructor(app: Application) {
    this.app = app;
    this.app.ajv = getAjvInstance();
  }

  async configDidLoad(): Promise<void> {
    const config = this.app.config;
    const typeboxValidate = config.typeboxValidate;
    if (typeboxValidate) {
      typeboxValidate.patchAjv?.(this.app.ajv);
    }
  }
}

declare module 'egg' {
  interface Application {
    ajv: Ajv;
  }
}
