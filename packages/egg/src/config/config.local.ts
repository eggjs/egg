import type { EggAppConfig, PowerPartial } from '../lib/types.ts';

export default () => {
  return {
    logger: {
      coreLogger: {
        consoleLevel: 'WARN',
      },
    },
  } satisfies PowerPartial<EggAppConfig>;
};
