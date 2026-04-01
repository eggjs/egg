import type { EggLogger } from 'egg-logger';

import { EggApplicationCore, type EggApplicationCoreOptions } from './egg.ts';
import { AgentWorkerLoader } from './loader/index.ts';

/**
 * Singleton instance in Agent Worker, extend {@link EggApplicationCore}
 * @augments EggApplicationCore
 */
export class Agent extends EggApplicationCore {
  #agentAliveHandler?: NodeJS.Timeout;

  /**
   * @class
   * @param {Object} options - see {@link EggApplicationCore}
   */
  constructor(options?: Omit<EggApplicationCoreOptions, 'type'>) {
    super({
      ...options,
      type: 'agent',
    });

    // Register keepalive timer in configDidLoad so it is naturally skipped
    // in snapshot mode (configDidLoad is not called during snapshot build).
    const agent = this;
    this.lifecycle.addBootHook(
      class AgentKeepAliveBoot {
        configDidLoad(): void {
          agent.startKeepAlive();
        }
      },
    );
  }

  /**
   * Start the keepalive timer that prevents the agent process from exiting
   * when it has no pending I/O. Called from configDidLoad so that the timer
   * is not created during snapshot build (configDidLoad is skipped in snapshot mode).
   */
  startKeepAlive(): void {
    if (this.#agentAliveHandler) return;
    this.#agentAliveHandler = setInterval(
      () => {
        this.coreLogger.info('[]');
      },
      24 * 60 * 60 * 1000,
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
    if (this.#agentAliveHandler) {
      clearInterval(this.#agentAliveHandler);
      this.#agentAliveHandler = undefined;
    }
    await super.close();
  }
}
