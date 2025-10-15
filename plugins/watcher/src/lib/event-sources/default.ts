import { BaseEventSource } from "./base.ts";

export default class DefaultEventSource extends BaseEventSource {
  constructor() {
    super();
    // delay emit so that can be listened
    setImmediate(() =>
      this.emit(
        "info",
        "[@eggjs/watcher] defaultEventSource watcher will NOT take effect",
      ),
    );
    this.ready(true);
  }

  watch(): void {
    this.emit(
      "info",
      "[@eggjs/watcher] using defaultEventSource watcher.watch() does NOTHING",
    );
  }

  unwatch(): void {
    this.emit(
      "info",
      "[@eggjs/watcher] using defaultEventSource watcher.unwatch() does NOTHING",
    );
  }
}
