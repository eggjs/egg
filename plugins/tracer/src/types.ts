import type { TracerConfig } from './config/config.default.ts';
import type { Tracer } from './lib/tracer.ts';

declare module 'egg' {
  interface EggAppConfig {
    /**
     * tracer config
     * @member Config#tracer
     * @property {Tracer} Class - tracer class name
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
