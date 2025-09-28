import type { TracerConfig } from './config/config.default.ts';
import type { Tracer } from './lib/tracer.js';

declare module 'egg' {
  // add EggAppConfig overrides types
  interface EggAppConfig {
    /**
     * tracer default config
     * @member Config#tracer
     */
    tracer: TracerConfig;
  }

  interface Application {
    tracer: Tracer;
  }

  interface Context {
    tracer: Tracer;
    traceId: string;
  }
}
