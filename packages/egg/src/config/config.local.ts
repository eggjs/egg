import type { EggAppConfig, PowerPartial } from '../lib/types.js';

export default () => {
  return {
    logger: {
      coreLogger: {
        consoleLevel: 'WARN',
      },
    },
  } satisfies PowerPartial<EggAppConfig>;
};
