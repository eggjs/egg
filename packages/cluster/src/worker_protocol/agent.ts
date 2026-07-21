import { EggConsoleLogger as ConsoleLogger } from 'egg-logger';
import type { Options as GracefulExitOptions } from 'graceful-process';

import type { MessageBody } from '../utils/messenger.ts';

/**
 * Transport used by the agent-worker protocol. Process and worker-thread
 * entries provide different implementations of this interface.
 */
export interface AgentWorkerIO {
  send(message: MessageBody): void;
  kill(): void;
  gracefulExit(options: GracefulExitOptions): void;
}

/**
 * Run the agent-worker side of the Egg cluster protocol on an already
 * constructed agent: report `agent-start` on readiness, exit on start error,
 * and wire graceful exit.
 */
export function startAgentWorker(
  agent: any,
  io: AgentWorkerIO,
  consoleLogger: ConsoleLogger = new ConsoleLogger({ level: process.env.EGG_AGENT_WORKER_LOGGER_LEVEL }),
): void {
  function startErrorHandler(err: Error) {
    consoleLogger.error(err);
    consoleLogger.error('[agent_worker] start error, exiting with code:1');
    io.kill();
  }

  agent.ready((err?: Error) => {
    // don't send started message to master when start error
    if (err) {
      return;
    }

    agent.removeListener('error', startErrorHandler);
    io.send({ action: 'agent-start', to: 'master' });
  });

  // exit if agent start error
  agent.once('error', startErrorHandler);

  io.gracefulExit({
    logger: consoleLogger,
    label: 'agent_worker',
    beforeExit: () => agent.close(),
  });
}
