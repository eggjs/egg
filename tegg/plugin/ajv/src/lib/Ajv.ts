import type { Ajv as IAjv } from '@eggjs/ajv-decorator';
import { SingletonProto, AccessLevel } from '@eggjs/core-decorator';
import { LifecycleInit } from '@eggjs/lifecycle';
import type { Schema, Ajv2019 as IAjv2019 } from 'ajv/dist/2019.js';

type AjvInvalidParamErrorClass = typeof import('@eggjs/ajv-decorator').AjvInvalidParamError;
type Ajv2019Class = typeof import('ajv/dist/2019.js').Ajv2019;

let AjvInvalidParamError: AjvInvalidParamErrorClass;
let addFormats: any;
let keyWords: any;
let Ajv2019: Ajv2019Class;
let loadAjvDepsPromise: Promise<void> | undefined;

async function loadAjvDeps(): Promise<void> {
  if (Ajv2019) {
    return;
  }
  loadAjvDepsPromise ??= Promise.all([
    import('@eggjs/ajv-decorator'),
    import('@eggjs/ajv-formats'),
    import('@eggjs/ajv-keywords'),
    import('ajv/dist/2019.js'),
  ])
    .then(([decorator, formats, keywords, ajv2019]) => {
      AjvInvalidParamError = decorator.AjvInvalidParamError;
      addFormats = (formats as any).default ?? formats;
      keyWords = (keywords as any).default ?? keywords;
      Ajv2019 = ajv2019.Ajv2019;
    })
    .catch((err) => {
      loadAjvDepsPromise = undefined;
      throw err;
    });
  await loadAjvDepsPromise;
}

@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class Ajv implements IAjv {
  static InvalidParamErrorClass: AjvInvalidParamErrorClass;

  #ajvInstance!: IAjv2019;

  @LifecycleInit()
  protected async _init(): Promise<void> {
    await loadAjvDeps();
    Ajv.InvalidParamErrorClass ??= AjvInvalidParamError;
    this.#ajvInstance = new Ajv2019();
    keyWords(this.#ajvInstance, 'transform');
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
