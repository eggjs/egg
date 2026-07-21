import { debuglog } from 'node:util';

import { importModule } from '@eggjs/utils';
import { EggConsoleLogger as ConsoleLogger } from 'egg-logger';

import { AgentThreadWorker } from './utils/mode/impl/worker_threads/agent.ts';
import { startAgentWorker, type AgentWorkerIO } from './worker_protocol/agent.ts';
import { createProcessWorkerIO } from './worker_protocol/process.ts';

const debug = debuglog('egg/cluster/agent_worker');

/**
 * agent worker is child_process forked by master.
 *
 * agent worker only exit in two cases:
 *  - receive signal SIGTERM, exit code 0 (exit gracefully)
 *  - receive disconnect event, exit code 110 (maybe master exit in accident)
 */
async function main() {
  // $ node agent_worker.js options
  const options = JSON.parse(process.argv[2]) as {
    framework: string;
    baseDir: string;
    require?: string[];
    startMode?: 'process' | 'worker_threads';
  };
  if (options.require) {
    // inject
    for (const mod of options.require) {
      await importModule(mod, {
        paths: [options.baseDir],
      });
    }
  }

  const workerIO: AgentWorkerIO =
    options.startMode === 'worker_threads' ? (AgentThreadWorker as unknown as AgentWorkerIO) : createProcessWorkerIO();

  const consoleLogger = new ConsoleLogger({
    level: process.env.EGG_AGENT_WORKER_LOGGER_LEVEL,
  });
  const { Agent } = await importModule(options.framework, {
    paths: [options.baseDir],
  });
  debug('new Agent with options %j', options);
  let agent: any;
  try {
    agent = new Agent(options);
  } catch (err) {
    consoleLogger.error(err);
    throw err;
  }

  startAgentWorker(agent, workerIO, consoleLogger);
}

main();
