import type { Ajv2019 as Ajv } from 'ajv/dist/2019.js';
import { defineConfigFactory, type EggConfigFactory } from 'egg';
// @ts-expect-error - semver no types
import { valid } from 'semver';

const config: EggConfigFactory = defineConfigFactory(() => {
  return {
    keys: '123456',
    security: {
      csrf: {
        ignoreJSON: true,
      },
    },
    typeboxValidate: {
      patchAjv: (ajv: Ajv) => {
        ajv.addFormat('byte', {
          type: 'number',
          validate: (x) => x >= 0 && x <= 255 && x % 1 === 0,
        });
        ajv.addFormat('json-string', {
          type: 'string',
          validate: (x) => {
            try {
              JSON.parse(x);
              return true;
            } catch (err) {
              return false;
            }
          },
        });
        ajv.addFormat('semver', {
          type: 'string',
          validate: (x) => valid(x) != null,
        });
      },
    },
  };
});

export default config;
