import type { EggAppConfig, PowerPartial } from '../lib/types.ts';

export default (): PowerPartial<EggAppConfig> => {
  return {
    logger: {
      coreLogger: {
        consoleLevel: 'WARN',
      },
    },
  } satisfies PowerPartial<EggAppConfig>;
};
