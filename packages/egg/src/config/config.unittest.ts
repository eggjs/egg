import type { EggAppConfig, PowerPartial } from '../lib/types.ts';

export default (): PowerPartial<EggAppConfig> => {
  return {
    logger: {
      consoleLevel: 'WARN',
      buffer: false,
    },
  } satisfies PowerPartial<EggAppConfig>;
};
