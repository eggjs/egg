import { debuglog } from 'node:util';
import workerThreads from 'node:worker_threads';
import type { Master } from '../master.js';
import type { WorkerManager } from './worker_manager.js';

const debug = debuglog('@eggjs/cluster/messenger');

export type MessageCharacter = 'agent' | 'app' | 'master' | 'parent';

export interface MessageBody {
  action: string;
  data?: unknown;
  to?: MessageCharacter;
  from?: MessageCharacter;
  /**
   * @deprecated Keep compatible, please use receiverWorkerId instead
   */
  receiverPid?: string;
  receiverWorkerId?: string;
  senderWorkerId?: string;
}

/**
 * master messenger, provide communication between parent, master, agent and app.
 *
 *             ┌────────┐
 *             │ parent │
 *            /└────────┘\
 *           /     |      \
 *          /  ┌────────┐  \
 *         /   │ master │   \
 *        /    └────────┘    \
 *       /     /         \    \
 *     ┌───────┐         ┌───────┐
 *     │ agent │ ------- │  app  │
 *     └───────┘         └───────┘
 *
 *
 * in app worker
 *
 * ```js
 * process.send({
 *   action: 'xxx',
 *   data: '',
 *   to: 'agent/master/parent', // default to agent
 * });
 * ```
 *
 * in agent worker
 *
 * ```js
 * process.send({
 *   action: 'xxx',
 *   data: '',
 *   to: 'app/master/parent', // default to app
 * });
 * ```
 *
 * in parent
 *
 * ```js
 * process.send({
 *   action: 'xxx',
 *   data: '',
 *   to: 'app/agent/master', // default to master
 * });
 * ```
 */
export class Messenger {
  #master: Master;
  #workerManager: WorkerManager;
  #hasParent: boolean;

  constructor(master: Master, workerManager: WorkerManager) {
    this.#master = master;
    this.#workerManager = workerManager;
    this.#hasParent = !!workerThreads.parentPort || !!process.send;
    process.on('message', (msg: MessageBody) => {
      msg.from = 'parent';
      this.send(msg);
    });
    process.once('disconnect', () => {
      this.#hasParent = false;
    });
  }

  /**
   * send message
   * @param {Object} data message body
   *  - {String} from from who
   *  - {String} to to who
   */
  send(data: MessageBody) {
    if (!data.from) {
      data.from = 'master';
    }

    // https://github.com/eggjs/egg/blob/b6861f1c7548f05a281386050dfeaeb30f236558/lib/core/messenger/ipc.js#L56
    // recognize receiverWorkerId is to who
    const receiverWorkerId = data.receiverWorkerId ?? data.receiverPid;
    if (receiverWorkerId) {
      if (receiverWorkerId === String(process.pid)) {
        data.to = 'master';
      } else if (receiverWorkerId === String(this.#workerManager.getAgent()!.workerId)) {
        data.to = 'agent';
      } else {
        data.to = 'app';
      }
    }

    // default from -> to rules
    if (!data.to) {
      if (data.from === 'agent') {
        data.to = 'app';
      }
      if (data.from === 'app') {
        data.to = 'agent';
      }
      if (data.from === 'parent') {
        data.to = 'master';
      }
    }

    // app -> master
    // agent -> master
    if (data.to === 'master') {
      debug('%s -> master, data: %j', data.from, data);
      // app/agent to master
      this.sendToMaster(data);
      return;
    }

    // master -> parent
    // app -> parent
    // agent -> parent
    if (data.to === 'parent') {
      debug('%s -> parent, data: %j', data.from, data);
      this.sendToParent(data);
      return;
    }

    // parent -> master -> app
    // agent -> master -> app
    if (data.to === 'app') {
      debug('%s -> %s, data: %j', data.from, data.to, data);
      this.sendToAppWorker(data);
      return;
    }

    // parent -> master -> agent
    // app -> master -> agent，可能不指定 to
    if (data.to === 'agent') {
      debug('%s -> %s, data: %j', data.from, data.to, data);
      this.sendToAgentWorker(data);
      return;
    }
  }

  /**
   * send message to master self
   * @param {Object} data message body
   */
  sendToMaster(data: MessageBody) {
    // e.g: master.on('app-start', data => {})
    this.#master.emit(data.action, data.data);
  }

  /**
   * send message to parent process
   * @param {Object} data message body
   */
  sendToParent(data: MessageBody) {
    if (!this.#hasParent) {
      return;
    }
    process.send!(data);
  }

  /**
   * send message to app worker
   * @param {Object} data message body
   */
  sendToAppWorker(data: MessageBody) {
    for (const worker of this.#workerManager.listWorkers()) {
      if (worker.state === 'disconnected') {
        continue;
      }
      // check receiverWorkerId
      const receiverWorkerId = data.receiverWorkerId ?? data.receiverPid;
      if (receiverWorkerId && receiverWorkerId !== String(worker.workerId)) {
        continue;
      }
      worker.send(data);
    }
  }

  /**
   * send message to agent worker
   * @param {Object} data message body
   */
  sendToAgentWorker(data: MessageBody) {
    const agent = this.#workerManager.getAgent();
    if (agent) {
      agent.send(data);
    }
  }
}
