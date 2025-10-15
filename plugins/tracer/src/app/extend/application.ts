import { debuglog } from "node:util";

import { Application } from "egg";

import type { Tracer } from "../../lib/tracer.ts";

const debug = debuglog("egg/tracer/app/extend/application");

const cacheTracer: unique symbol = Symbol("before_ready_tracer");
export const isReady: unique symbol = Symbol("egg_tracer_is_ready");

export default class TracerApplication extends Application {
  get tracer(): Tracer {
    if (this[isReady]) {
      return new this.config.tracer.Class(this.createAnonymousContext());
    }

    if (!this[cacheTracer]) {
      this[cacheTracer] = new this.config.tracer.Class(
        this.createAnonymousContext(),
      );
    }

    debug("use cached tracer before ready, type: %o", this.type);
    return this[cacheTracer] as Tracer;
  }
}
