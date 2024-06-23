import type { EggAppConfig } from '../lib/type.js';

export default () => {
  return {
    logger: {
      coreLogger: {
        consoleLevel: 'WARN',
      },
    },
  } satisfies Partial<EggAppConfig>;
}
