import type { EggAppConfig, PowerPartial } from 'egg';
import { valid } from 'semver';

export default () => {
  const config = {} as PowerPartial<EggAppConfig>;
  config.keys = '123456';
  config.security = {
    csrf: {
      ignoreJSON: true,
    },
  };

  config.typeboxValidate = {
    patchAjv: ajv => {
      ajv.addFormat('byte', {
        type: 'number',
        validate: x => x >= 0 && x <= 255 && x % 1 === 0,
      });
      ajv.addFormat('json-string', {
        type: 'string',
        validate: x => {
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
        validate: x => valid(x) != null,
      });
    },
  };
  return config;
};
