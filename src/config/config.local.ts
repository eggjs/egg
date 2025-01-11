import type { EggAppConfig } from '../lib/types.js';

export default () => {
  return {
    logger: {
      coreLogger: {
        consoleLevel: 'WARN',
      },
    },
  } satisfies Partial<EggAppConfig>;
};
