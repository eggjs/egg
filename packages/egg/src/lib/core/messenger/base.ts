import { EventEmitter, captureRejectionSymbol } from 'node:events';
import { MessageUnhandledRejectionError } from '../../error/index.js';
import { EggApplicationCore } from '../../egg.js';

export class BaseMessenger extends EventEmitter {
  protected readonly egg: EggApplicationCore;

  constructor(egg: EggApplicationCore) {
    super({ captureRejections: true });
    this.egg = egg;
  }

  [captureRejectionSymbol](err: Error, event: string | symbol, ...args: any[]) {
    this.egg.coreLogger.error(new MessageUnhandledRejectionError(err, event, args));
  }

  emit(eventName: string | symbol, ...args: any[]): boolean {
    const hasListeners = this.listenerCount(eventName) > 0;
    try {
      return super.emit(eventName, ...args);
    } catch (e: unknown) {
      let err = e as Error;
      if (!(err instanceof Error)) {
        err = new Error(String(err));
      }
      this.egg.coreLogger.error(new MessageUnhandledRejectionError(err, eventName, args));
      return hasListeners;
    }
  }
}
