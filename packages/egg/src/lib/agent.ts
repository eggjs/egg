import type { EggLogger } from 'egg-logger';

import { EggApplicationCore, type EggApplicationCoreOptions } from './egg.ts';
import { AgentWorkerLoader } from './loader/index.ts';

/**
 * Singleton instance in Agent Worker, extend {@link EggApplicationCore}
 * @augments EggApplicationCore
 */
export class Agent extends EggApplicationCore {
  readonly #agentAliveHandler: NodeJS.Timeout;

  /**
   * @class
   * @param {Object} options - see {@link EggApplicationCore}
   */
  constructor(options?: Omit<EggApplicationCoreOptions, 'type'>) {
    super({
      ...options,
      type: 'agent',
    });

    // keep agent alive even it doesn't have any io tasks
    this.#agentAliveHandler = setInterval(
      () => {
        this.coreLogger.info('[]');
      },
      24 * 60 * 60 * 1000
    );
  }

  protected override customEggLoader(): typeof AgentWorkerLoader {
    return AgentWorkerLoader;
  }

  _wrapMessenger(): void {
    for (const methodName of ['broadcast', 'sendTo', 'sendToApp', 'sendToAgent', 'sendRandom']) {
      wrapMethod(methodName, this.messenger, this.coreLogger);
    }

    function wrapMethod(methodName: string, messenger: any, logger: EggLogger): void {
      const originMethod = messenger[methodName];
      messenger[methodName] = function (...args: any[]): void {
        const stack = new Error().stack!.split('\n').slice(1).join('\n');
        logger.warn("agent can't call %s before server started\n%s", methodName, stack);
        originMethod.apply(this, args);
      };
      messenger.prependOnceListener('egg-ready', () => {
        messenger[methodName] = originMethod;
      });
    }
  }

  async close(): Promise<void> {
    clearInterval(this.#agentAliveHandler);
    await super.close();
  }
}
