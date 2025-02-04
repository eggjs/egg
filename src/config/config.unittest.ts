import type { EggAppConfig, PowerPartial } from '../lib/types.js';

export default () => {
  return {
    logger: {
      consoleLevel: 'WARN',
      buffer: false,
    },
  } satisfies PowerPartial<EggAppConfig>;
};
