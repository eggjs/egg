import { debuglog } from 'node:util';
import { EggConsoleLogger as ConsoleLogger } from 'egg-logger';
import { importModule } from '@eggjs/utils';
import { BaseAgentWorker } from './utils/mode/base/agent.js';
import { AgentThreadWorker } from './utils/mode/impl/worker_threads/agent.js';
import { AgentProcessWorker } from './utils/mode/impl/process/agent.js';

const debug = debuglog('@eggjs/cluster/agent_worker');

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
        paths: [ options.baseDir ],
      });
    }
  }

  let AgentWorker: typeof BaseAgentWorker;
  if (options.startMode === 'worker_threads') {
    AgentWorker = AgentThreadWorker as any;
  } else {
    AgentWorker = AgentProcessWorker as any;
  }

  const consoleLogger = new ConsoleLogger({ level: process.env.EGG_AGENT_WORKER_LOGGER_LEVEL });
  const { Agent } = await importModule(options.framework, {
    paths: [ options.baseDir ],
  });
  debug('new Agent with options %j', options);
  let agent: any;
  try {
    agent = new Agent(options);
  } catch (err) {
    consoleLogger.error(err);
    throw err;
  }

  function startErrorHandler(err: Error) {
    consoleLogger.error(err);
    consoleLogger.error('[agent_worker] start error, exiting with code:1');
    AgentWorker.kill();
  }

  agent.ready((err?: Error) => {
    // don't send started message to master when start error
    if (err) {
      return;
    }

    agent.removeListener('error', startErrorHandler);
    AgentWorker.send({ action: 'agent-start', to: 'master' });
  });

  // exit if agent start error
  agent.once('error', startErrorHandler);

  AgentWorker.gracefulExit({
    logger: consoleLogger,
    label: 'agent_worker',
    beforeExit: () => agent.close(),
  });
}

main();
