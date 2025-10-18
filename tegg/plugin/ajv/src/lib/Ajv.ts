import { type Schema, Ajv2019 } from 'ajv/dist/2019.js';
import addFormats from '@eggjs/ajv-formats';
import keyWords from '@eggjs/ajv-keywords';
import { type Ajv as IAjv, AjvInvalidParamError } from '@eggjs/tegg/ajv';
import { SingletonProto, AccessLevel, LifecycleInit } from '@eggjs/tegg';

@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class Ajv implements IAjv {
  static InvalidParamErrorClass = AjvInvalidParamError;

  #ajvInstance: Ajv2019;

  @LifecycleInit()
  protected _init() {
    this.#ajvInstance = new Ajv2019();
    // @ts-expect-error ajv-keywords is not typed
    keyWords(this.#ajvInstance, 'transform');
    // @ts-expect-error ajv-formats is not typed
    addFormats(this.#ajvInstance, [
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
  }

  /**
   * Validate data with typebox Schema.
   *
   * If validate fail, with throw `Ajv.InvalidParamErrorClass`
   */
  validate(schema: Schema, data: unknown): void {
    const result = this.#ajvInstance.validate(schema, data);
    if (!result) {
      throw new Ajv.InvalidParamErrorClass('Validation Failed', {
        errorData: data,
        currentSchema: JSON.stringify(schema),
        errors: this.#ajvInstance.errors!,
      });
    }
  }
}
