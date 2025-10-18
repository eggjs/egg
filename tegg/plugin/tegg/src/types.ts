import '@eggjs/tegg-config/types';

import './app/extend/application.ts';
import './app/extend/application.unittest.ts';
import './app/extend/context.ts';

declare module 'egg' {
  export interface EggModule {}
}
