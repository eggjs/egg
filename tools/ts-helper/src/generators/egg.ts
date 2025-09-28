import { TsGenConfig, TsHelperConfig } from '..';
import path from 'node:path';

// declare global namespace Egg
export default function EggGenerator(config: TsGenConfig, baseConfig: TsHelperConfig) {
  return {
    dist: path.resolve(config.dtsDir, 'index.d.ts'),
    content:
      `export * from '${baseConfig.framework}';\n` +
      'export as namespace Egg;\n',
  };
}

EggGenerator.isPrivate = true;
