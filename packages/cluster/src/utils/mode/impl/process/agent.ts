import { fork, type ChildProcess, type ForkOptions } from 'node:child_process';
import { sendmessage } from 'sendmessage';
import { graceful as gracefulExit, type Options as gracefulExitOptions } from 'graceful-process';
import { BaseAgentWorker, BaseAgentUtils } from '../../base/agent.js';
import { terminate } from '../../../terminate.js';
import type { MessageBody } from '../../../messenger.js';
import { ClusterAgentWorkerError } from '../../../../error/ClusterAgentWorkerError.js';

export class AgentProcessWorker extends BaseAgentWorker<ChildProcess> {
  get workerId() {
    return this.instance.pid!;
  }

  send(message: MessageBody) {
    sendmessage(this.instance, message);
  }

  static send(message: MessageBody) {
    message.senderWorkerId = String(process.pid);
    process.send!(message);
  }

  static kill() {
    process.exitCode = 1;
    process.kill(process.pid);
  }

  static gracefulExit(options: gracefulExitOptions) {
    gracefulExit(options);
  }
}

export class AgentProcessUtils extends BaseAgentUtils {
  #agentProcess: ChildProcess;
  #id = 0;
  instance: AgentProcessWorker;

  fork() {
    this.startTime = Date.now();

    const args = [ JSON.stringify(this.options) ];
    const forkOptions: ForkOptions & { windowsHide?: boolean } = {};

    if (process.platform === 'win32') {
      forkOptions.windowsHide = true;
    }

    // add debug execArgv
    const debugPort = process.env.EGG_AGENT_DEBUG_PORT ?? 5800;
    if (this.options.isDebug) {
      forkOptions.execArgv = process.execArgv.concat([ `--inspect-port=${debugPort}` ]);
    }

    const agentProcess = this.#agentProcess = fork(this.getAgentWorkerFile(), args, forkOptions);
    const agentWorker = this.instance = new AgentProcessWorker(agentProcess);
    agentWorker.status = 'starting';
    agentWorker.id = ++this.#id;
    this.emit('agent_forked', agentWorker);
    this.log('[master] agent_worker#%s:%s start with clusterPort:%s',
      agentWorker.id, agentWorker.workerId, this.options.clusterPort);

    // send debug message
    if (this.options.isDebug) {
      this.messenger.send({
        to: 'parent',
        from: 'agent',
        action: 'debug',
        data: {
          debugPort,
          // keep compatibility, should use workerId instead
          pid: agentWorker.workerId,
          workerId: agentWorker.workerId,
        },
      });
    }
    // forwarding agent' message to messenger
    agentProcess.on('message', (msg: MessageBody | string) => {
      if (typeof msg === 'string') {
        msg = {
          action: msg,
          data: msg,
        };
      }
      msg.from = 'agent';
      this.messenger.send(msg);
    });
    // logger error event
    agentProcess.on('error', err => {
      err.name = 'AgentWorkerError';
      this.logger.error(new ClusterAgentWorkerError(agentWorker.id, agentWorker.workerId, agentWorker.status, err));
    });
    // agent exit message
    agentProcess.once('exit', (code, signal) => {
      this.messenger.send({
        action: 'agent-exit',
        data: {
          code,
          signal,
        },
        to: 'master',
        from: 'agent',
      });
    });

    return this;
  }

  clean() {
    this.#agentProcess.removeAllListeners();
  }

  async kill(timeout: number) {
    if (this.#agentProcess) {
      this.log('[master] kill agent worker with signal SIGTERM');
      this.clean();
      await terminate(this.#agentProcess, timeout);
    }
  }
}
