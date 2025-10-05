import type { TypeboxValidateConfig } from './config/config.default.ts';
import type { Ajv2019 as Ajv } from 'ajv/dist/2019.js';
import type { Schema } from 'ajv/dist/2019.js';

declare module 'egg' {
  interface EggAppConfig {
    typeboxValidate: TypeboxValidateConfig;
  }

  interface Application {
    ajv: Ajv;
  }

  interface Context {
    tValidate(schema: Schema, data: unknown): boolean;
    tValidateWithoutThrow(schema: Schema, data: unknown): boolean;
  }
}
