import { Context } from 'egg';
import type { Schema } from 'ajv/dist/2019.js';

export default class AjvContext extends Context {
  tValidate(schema: Schema, data: unknown): boolean {
    const ajv = this.app.ajv;
    const res = ajv.validate(schema, data);
    if (!res) {
      this.throw(422, 'Validation Failed', {
        code: 'invalid_param',
        errorData: data,
        // TODO: high CPU usage https://github.com/eggjs/egg/pull/5583#discussion_r2404265446
        currentSchema: JSON.stringify(schema),
        errors: ajv.errors,
      });
    }
    return res;
  }

  tValidateWithoutThrow(schema: Schema, data: unknown): boolean {
    const res = this.app.ajv.validate(schema, data);
    return res;
  }
}

declare module 'egg' {
  interface Context {
    tValidate(schema: Schema, data: unknown): boolean;
    tValidateWithoutThrow(schema: Schema, data: unknown): boolean;
  }
}
