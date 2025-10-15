import { debuglog } from "node:util";

import type { ILifecycleBoot, Application } from "egg";

import { isReady } from "./app/extend/application.ts";

const debug = debuglog("egg/tracer/boot");

export class TracerBoot implements ILifecycleBoot {
  private readonly app;
  constructor(app: Application) {
    this.app = app;
  }

  async didLoad(): Promise<void> {
    debug("didLoad %o", this.app.type);
    this.app[isReady] = true;
  }
}
