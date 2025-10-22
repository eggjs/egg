import type { PartialEggConfig } from 'egg';
// @ts-expect-error - semver no types
import { valid } from 'semver';
import type { Ajv2019 as Ajv } from 'ajv/dist/2019.js';

export default (): PartialEggConfig => {
  const config = {} as PartialEggConfig;
  config.keys = '123456';
  config.security = {
    csrf: {
      ignoreJSON: true,
    },
  };

  config.typeboxValidate = {
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
  };
  return config;
};
