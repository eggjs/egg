import { Tracer } from '../lib/tracer.ts';

export interface TracerConfig {
  Class: typeof Tracer;
}

export default {
  tracer: {
    Class: Tracer,
  } as TracerConfig,
};
