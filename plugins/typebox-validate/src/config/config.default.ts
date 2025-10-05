import type { Ajv2019 as Ajv } from 'ajv/dist/2019.js';

export interface TypeboxValidateConfig {
  patchAjv?: (ajv: Ajv) => void;
}

export default {
  typeboxValidate: {
    patchAjv: undefined,
  } as TypeboxValidateConfig,
};

declare module 'egg' {
  interface EggAppConfig {
    /**
     * typebox validate options
     * @member Config#typeboxValidate
     */
    typeboxValidate: TypeboxValidateConfig;
  }
}
