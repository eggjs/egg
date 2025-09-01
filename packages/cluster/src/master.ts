import os from 'node:os';
import v8 from 'node:v8';
import util from 'node:util';
import path from 'node:path';
import fs from 'node:fs';
import net from 'node:net';
import { debuglog } from 'node:util';
import { ReadyEventEmitter } from 'get-ready';
import { detectPort } from 'detect-port';
import { reload } from 'cluster-reload';
import { EggConsoleLogger as ConsoleLogger } from 'egg-logger';
import { readJSONSync } from 'utility';
import terminalLink from 'terminal-link';
import { parseOptions, ClusterOptions, ParsedClusterOptions } from './utils/options.js';
import { WorkerManager } from './utils/worker_manager.js';
import { Messenger } from './utils/messenger.js';
import {
  AgentProcessWorker, AgentProcessUtils as ProcessAgentWorker,
} from './utils/mode/impl/process/agent.js';
import { AppProcessWorker, AppProcessUtils as ProcessAppWorker } from './utils/mode/impl/process/app.js';
import {
  AgentThreadWorker, AgentThreadUtils as WorkerThreadsAgentWorker,
} from './utils/mode/impl/worker_threads/agent.js';
import { AppThreadWorker, AppThreadUtils as WorkerThreadsAppWorker } from './utils/mode/impl/worker_threads/app.js';
import { ClusterWorkerExceptionError } from './error/ClusterWorkerExceptionError.js';

const debug = debuglog('@eggjs/cluster/master');

export interface MasterOptions extends ParsedClusterOptions {
  clusterPort?: number;
  stickyWorkerPort?: number;
}

export class Master extends ReadyEventEmitter {
  options: MasterOptions;
  isStarted = false;
  workerManager: WorkerManager;
  messenger: Messenger;
  isProduction: boolean;
  agentWorkerIndex = 0;
  closed = false;
  logger: ConsoleLogger;
  agentWorker: ProcessAgentWorker | WorkerThreadsAgentWorker;
  appWorker: ProcessAppWorker | WorkerThreadsAppWorker;
  #logMethod: 'info' | 'debug';
  #realPort?: number;
  #protocol: string;
  #appAddress: string;

  constructor(options?: ClusterOptions) {
    super();
    this.#start(options)
      .catch(err => {
        this.ready(err);
      });
  }

  async #start(options?: ClusterOptions) {
    this.options = await parseOptions(options);
    this.workerManager = new WorkerManager();
    this.messenger = new Messenger(this, this.workerManager);
    this.isProduction = isProduction(this.options);
    this.#realPort = this.options.port;
    this.#protocol = this.options.https ? 'https' : 'http';

    // app started or not
    this.isStarted = false;
    this.logger = new ConsoleLogger({ level: process.env.EGG_MASTER_LOGGER_LEVEL ?? 'INFO' });
    this.#logMethod = 'info';
    if (this.options.env === 'local' || process.env.NODE_ENV === 'development') {
      this.#logMethod = 'debug';
    }

    // get the real framework info
    const frameworkPath = this.options.framework;
    const frameworkPkg = readJSONSync(path.join(frameworkPath, 'package.json'));

    // set app & agent worker impl
    if (this.options.startMode === 'worker_threads') {
      this.startByWorkerThreads();
    } else {
      this.startByProcess();
    }

    this.log(`[master] =================== ${frameworkPkg.name} start 🥚🥚🥚🥚 =====================`);
    this.logger.info(`[master] node version ${process.version}`);
    /* istanbul ignore next */
    if ('alinode' in process) {
      this.logger.info(`[master] alinode version ${process.alinode}`);
    }
    this.logger.info(`[master] ${frameworkPkg.name} version ${frameworkPkg.version}`);

    if (this.isProduction) {
      this.logger.info('[master] start with options:%s%s',
        os.EOL, JSON.stringify(this.options, null, 2));
    } else {
      this.log('[master] start with options: %j', this.options);
    }
    this.log('[master] start with env: isProduction: %s, EGG_SERVER_ENV: %s, NODE_ENV: %s',
      this.isProduction, this.options.env, process.env.NODE_ENV);

    const startTime = Date.now();

    this.ready(() => {
      this.isStarted = true;
      const stickyMsg = this.options.sticky ? ' with STICKY MODE!' : '';
      const startedURL = terminalLink(this.#appAddress, this.#appAddress, { fallback: false });
      this.logger.info('[master] %s started on %s (%sms)%s',
        frameworkPkg.name, startedURL, Date.now() - startTime, stickyMsg);
      if (this.options.debugPort) {
        const url = getAddress({
          port: this.options.debugPort,
          protocol: 'http',
        });
        const debugPortURL = terminalLink(url, url, { fallback: false });
        this.logger.info('[master] %s started debug port on %s', frameworkPkg.name, debugPortURL);
      }

      const action = 'egg-ready';
      this.messenger.send({
        action,
        to: 'parent',
        data: {
          port: this.#realPort,
          debugPort: this.options.debugPort,
          address: this.#appAddress,
          protocol: this.#protocol,
        },
      });
      this.messenger.send({
        action,
        to: 'app',
        data: this.options,
      });
      this.messenger.send({
        action,
        to: 'agent',
        data: this.options,
      });

      // start check agent and worker status
      if (this.isProduction) {
        this.workerManager.startCheck();
      }
    });

    this.on('agent-exit', this.onAgentExit.bind(this));
    this.on('agent-start', this.onAgentStart.bind(this));
    this.on('app-exit', this.onAppExit.bind(this));
    this.on('app-start', this.onAppStart.bind(this));
    this.on('reload-worker', this.onReload.bind(this));


    // fork app workers after agent started
    this.once('agent-start', this.forkAppWorkers.bind(this));
    // get the real port from options and app.config
    // app worker will send after loading
    this.on('realport', ({ port, protocol }) => {
      // this.logger.info('[master] got realport: %s, protocol: %s', port, protocol);
      if (port) {
        this.#realPort = port;
      }
      if (protocol) {
        this.#protocol = protocol;
      }
    });

    // https://nodejs.org/api/process.html#process_signal_events
    // https://en.wikipedia.org/wiki/Unix_signal
    // kill(2) Ctrl-C
    process.once('SIGINT', this.onSignal.bind(this, 'SIGINT'));
    // kill(3) Ctrl-\
    process.once('SIGQUIT', this.onSignal.bind(this, 'SIGQUIT'));
    // kill(15) default
    process.once('SIGTERM', this.onSignal.bind(this, 'SIGTERM'));

    process.once('exit', this.onExit.bind(this));

    // write pid to file if provided
    if (this.options.pidFile) {
      fs.mkdirSync(path.dirname(this.options.pidFile), { recursive: true });
      fs.writeFileSync(this.options.pidFile, process.pid.toString(), 'utf-8');
    }

    this.detectPorts()
      .then(() => {
        this.forkAgentWorker();
      });

    // exit when agent or worker exception
    this.workerManager.on('exception', (count: {
      agent: number;
      worker: number;
    }) => {
      const err = new ClusterWorkerExceptionError(count.agent, count.worker);
      this.logger.error(err);
      process.exit(1);
    });
  }

  startByProcess() {
    this.agentWorker = new ProcessAgentWorker(this.options, {
      log: this.log.bind(this),
      logger: this.logger,
      messenger: this.messenger,
    });

    this.appWorker = new ProcessAppWorker(this.options, {
      log: this.log.bind(this),
      logger: this.logger,
      messenger: this.messenger,
      isProduction: this.isProduction,
    });
  }

  startByWorkerThreads() {
    this.agentWorker = new WorkerThreadsAgentWorker(this.options, {
      log: this.log.bind(this),
      logger: this.logger,
      messenger: this.messenger,
    });

    this.appWorker = new WorkerThreadsAppWorker(this.options, {
      log: this.log.bind(this),
      logger: this.logger,
      messenger: this.messenger,
      isProduction: this.isProduction,
    });
  }

  async detectPorts() {
    // Detect cluster client port
    try {
      const clusterPort = await detectPort();
      this.options.clusterPort = clusterPort;
      // If sticky mode, detect worker port
      if (this.options.sticky) {
        const stickyWorkerPort = await detectPort();
        this.options.stickyWorkerPort = stickyWorkerPort;
      }
    } catch (err) {
      this.logger.error(err);
      process.exit(1);
    }
  }

  log(msg: string, ...args: any[]) {
    this.logger[this.#logMethod](msg, ...args);
  }

  startMasterSocketServer(cb: (err?: Error) => void) {
    // Create the outside facing server listening on our port.
    net.createServer({
      pauseOnConnect: true,
    }, connection => {
      // We received a connection and need to pass it to the appropriate
      // worker. Get the worker for this connection's source IP and pass
      // it the connection.

      /* istanbul ignore next */
      if (!connection.remoteAddress) {
        // This will happen when a client sends an RST(which is set to 1) right
        // after the three-way handshake to the server.
        // Read https://en.wikipedia.org/wiki/TCP_reset_attack for more details.
        connection.destroy();
      } else {
        const worker = this.stickyWorker(connection.remoteAddress) as AppProcessWorker;
        worker.instance.send('sticky-session:connection', connection);
      }
    }).listen(this.#realPort, cb);
  }

  stickyWorker(ip: string) {
    const workerNumbers = this.options.workers;
    const ws = this.workerManager.listWorkerIds();

    let s = '';
    for (let i = 0; i < ip.length; i++) {
      if (!isNaN(parseInt(ip[i]))) {
        s += ip[i];
      }
    }
    const pid = ws[Number(s) % workerNumbers];
    return this.workerManager.getWorker(pid)!;
  }

  forkAgentWorker() {
    this.agentWorker.on('agent_forked', (agent: AgentProcessWorker | AgentThreadWorker) => {
      this.workerManager.setAgent(agent);
    });
    this.agentWorker.fork();
  }

  forkAppWorkers() {
    this.appWorker.on('worker_forked', (worker: AppProcessWorker | AppThreadWorker) => {
      this.workerManager.setWorker(worker);
    });
    this.appWorker.fork();
  }

  /**
   * close agent worker, App Worker will closed by cluster
   *
   * https://www.exratione.com/2013/05/die-child-process-die/
   * make sure Agent Worker exit before master exit
   *
   * @param {number} timeout - kill agent timeout
   * @return {Promise} -
   */
  async killAgentWorker(timeout: number) {
    await this.agentWorker.kill(timeout);
  }

  async killAppWorkers(timeout: number) {
    await this.appWorker.kill(timeout);
  }

  /**
   * Agent Worker exit handler
   * Will exit during startup, and refork during running.
   */
  onAgentExit(data: {
    /** exit code */
    code: number;
    /** received signal */
    signal: string;
  }) {
    if (this.closed) return;

    this.messenger.send({
      action: 'egg-pids',
      to: 'app',
      data: [],
    });
    const agentWorker = this.agentWorker;
    this.workerManager.deleteAgent();

    const err = new Error(util.format('[master] agent_worker#%s:%s died (code: %s, signal: %s)',
      agentWorker.instance.id, agentWorker.instance.workerId, data.code, data.signal));
    err.name = 'AgentWorkerDiedError';
    this.logger.error(err);

    // remove all listeners to avoid memory leak
    agentWorker.clean();

    if (this.isStarted) {
      this.log('[master] try to start a new agent_worker after 1s ...');
      setTimeout(() => {
        this.logger.info('[master] new agent_worker starting...');
        this.forkAgentWorker();
      }, 1000);
      this.messenger.send({
        action: 'agent-worker-died',
        to: 'parent',
      });
    } else {
      this.logger.error('[master] agent_worker#%s:%s start fail, exiting with code:1',
        agentWorker.instance.id, agentWorker.instance.workerId);
      process.exit(1);
    }
  }

  onAgentStart() {
    this.agentWorker.instance.status = 'started';

    // Send egg-ready when agent is started after launched
    if (this.appWorker.isAllWorkerStarted) {
      this.messenger.send({
        action: 'egg-ready',
        to: 'agent',
        data: this.options,
      });
    }

    this.messenger.send({
      action: 'egg-pids',
      to: 'app',
      data: [ this.agentWorker.instance.workerId ],
    });
    // should send current worker pids when agent restart
    if (this.isStarted) {
      this.messenger.send({
        action: 'egg-pids',
        to: 'agent',
        data: this.workerManager.getListeningWorkerIds(),
      });
    }

    this.messenger.send({
      action: 'agent-start',
      to: 'app',
    });
    this.logger.info('[master] agent_worker#%s:%s started (%sms)',
      this.agentWorker.instance.id, this.agentWorker.instance.workerId,
      Date.now() - this.agentWorker.startTime);
  }

  /**
   * App Worker exit handler
   */
  onAppExit(data: {
    workerId: number;
    code: number;
    signal: string;
  }) {
    if (this.closed) return;

    const worker = this.workerManager.getWorker(data.workerId)!;
    if (!worker.isDevReload) {
      const signal = data.signal;
      const message = util.format(
        '[master] app_worker#%s:%s died (code: %s, signal: %s, suicide: %s, state: %s), current workers: %j',
        worker.id, worker.workerId, worker.exitCode, signal,
        worker.exitedAfterDisconnect, worker.state,
        this.workerManager.listWorkerIds(),
      );
      if (this.options.isDebug && signal === 'SIGKILL') {
        // exit if died during debug
        this.logger.error(message);
        this.logger.error('[master] worker kill by debugger, exiting...');
        setTimeout(() => this.close(), 10);
      } else {
        const err = new Error(message);
        err.name = 'AppWorkerDiedError';
        this.logger.error(err);
      }
    }

    // remove all listeners to avoid memory leak
    worker.clean();
    this.workerManager.deleteWorker(data.workerId);
    // send message to agent with alive workers
    this.messenger.send({
      action: 'egg-pids',
      to: 'agent',
      data: this.workerManager.getListeningWorkerIds(),
    });

    if (this.appWorker.isAllWorkerStarted) {
      // cfork will only refork at production mode
      this.messenger.send({
        action: 'app-worker-died',
        to: 'parent',
      });
    } else {
      // exit if died during startup
      this.logger.error('[master] app_worker#%s:%s start fail, exiting with code:1',
        worker.id, worker.workerId);
      process.exit(1);
    }
  }

  /**
   * after app worker
   */
  onAppStart(data: {
    workerId: number;
    address: ListeningAddress;
  }) {
    const worker = this.workerManager.getWorker(data.workerId)!;
    debug('got app_worker#%s:%s app-start event, data: %j', worker.id, worker.workerId, data);

    const address = data.address;
    // worker should listen stickyWorkerPort when sticky mode
    if (this.options.sticky) {
      if (String(address.port) !== String(this.options.stickyWorkerPort)) {
        return;
      }
      // worker should listen REALPORT when not sticky mode
    } else if (this.options.startMode !== 'worker_threads' &&
      !isUnixSock(address) &&
      (String(address.port) !== String(this.#realPort))) {
      return;
    }
    worker.state = 'listening';

    // send message to agent with alive workers
    this.messenger.send({
      action: 'egg-pids',
      to: 'agent',
      data: this.workerManager.getListeningWorkerIds(),
    });
    // send message to app with current agent worker id
    this.messenger.send({
      action: 'egg-pids',
      to: 'app',
      data: [ this.agentWorker.instance.workerId ],
      receiverWorkerId: String(worker.workerId),
      receiverPid: String(worker.workerId),
    });

    this.appWorker.startSuccessCount++;
    const remain = this.appWorker.isAllWorkerStarted ? 0 : this.options.workers - this.appWorker.startSuccessCount;
    this.log('[master] app_worker#%s:%s started at %s, remain %s (%sms)',
      worker.id, worker.workerId, address.port, remain,
      Date.now() - this.appWorker.startTime);

    // Send egg-ready when app is started after launched
    if (this.appWorker.isAllWorkerStarted) {
      this.messenger.send({
        action: 'egg-ready',
        to: 'app',
        data: this.options,
      });
    }

    // if app is started, it should enable this worker
    if (this.appWorker.isAllWorkerStarted) {
      worker.disableRefork = false;
    }

    if (this.appWorker.isAllWorkerStarted || this.appWorker.startSuccessCount < this.options.workers) {
      return;
    }

    this.appWorker.isAllWorkerStarted = true;

    // enable all workers when app started
    for (const worker of this.workerManager.listWorkers()) {
      worker.disableRefork = false;
    }

    address.protocol = this.#protocol;
    address.port = this.options.sticky ? this.#realPort! : address.port;
    this.#appAddress = getAddress(address);

    if (this.options.sticky) {
      this.startMasterSocketServer(err => {
        if (err) {
          return this.ready(err);
        }
        this.ready(true);
      });
    } else {
      this.ready(true);
    }
  }

  /**
   * master exit handler
   */
  onExit(code: number) {
    if (this.options.pidFile && fs.existsSync(this.options.pidFile)) {
      try {
        fs.unlinkSync(this.options.pidFile);
      } catch (err: any) {
        /* istanbul ignore next */
        this.logger.error('[master] delete pidFile %s fail with %s', this.options.pidFile, err.message);
      }
    }
    // istanbul can't cover here
    // https://github.com/gotwarlost/istanbul/issues/567
    const level = code === 0 ? 'info' : 'error';
    this.logger[level]('[master] exit with code:%s', code);
  }

  onSignal(signal: string) {
    if (this.closed) return;

    this.logger.info('[master] master is killed by signal %s, closing', signal);
    // logger more info
    const { used_heap_size, heap_size_limit } = v8.getHeapStatistics();
    this.logger.info('[master] system memory: total %s, free %s', os.totalmem(), os.freemem());
    this.logger.info('[master] process info: heap_limit %s, heap_used %s', heap_size_limit, used_heap_size);

    this.close();
  }

  /**
   * reload workers, for develop purpose
   */
  onReload() {
    this.log('[master] reload %s workers...', this.options.workers);
    for (const worker of this.workerManager.listWorkers()) {
      worker.isDevReload = true;
    }
    reload(this.options.workers);
  }

  async close() {
    this.closed = true;
    try {
      await this._doClose();
      this.log('[master] close done, exiting with code:0');
      process.exit(0);
    } catch (e) {
      this.logger.error('[master] close with error: ', e);
      process.exit(1);
    }
  }

  async _doClose() {
    // kill app workers
    // kill agent worker
    // exit itself
    const legacyTimeout = process.env.EGG_MASTER_CLOSE_TIMEOUT || '5000';
    const appTimeout = parseInt(process.env.EGG_APP_CLOSE_TIMEOUT || legacyTimeout);
    const agentTimeout = parseInt(process.env.EGG_AGENT_CLOSE_TIMEOUT || legacyTimeout);
    this.logger.info('[master] send kill SIGTERM to app workers, will exit with code:0 after %sms', appTimeout);
    this.logger.info('[master] wait %sms', appTimeout);
    try {
      await this.killAppWorkers(appTimeout);
    } catch (e) {
      this.logger.error('[master] app workers exit error: ', e);
    }
    this.logger.info('[master] send kill SIGTERM to agent worker, will exit with code:0 after %sms', agentTimeout);
    this.logger.info('[master] wait %sms', agentTimeout);
    try {
      await this.killAgentWorker(agentTimeout);
    } catch (e) /* istanbul ignore next */ {
      this.logger.error('[master] agent worker exit error: ', e);
    }
  }
}

function isProduction(options: ClusterOptions) {
  if (options.env) {
    return options.env !== 'local' && options.env !== 'unittest';
  }
  return process.env.NODE_ENV === 'production';
}

interface ListeningAddress {
  port: number;
  protocol: string;
  address?: string;
  // https://nodejs.org/api/cluster.html#cluster_event_listening_1
  addressType?: number;
}

function getAddress({
  addressType,
  address,
  port,
  protocol,
}: ListeningAddress) {
  // unix sock
  // https://nodejs.org/api/cluster.html#cluster_event_listening_1
  if (addressType === -1) {
    return address!;
  }

  // {"address":"::","family":"IPv6","port":17001}
  if (address === '::') {
    address = '';
  }
  if (!address && process.env.HOST && process.env.HOST !== '0.0.0.0') {
    address = process.env.HOST;
  }
  if (!address) {
    address = '127.0.0.1';
  }
  return `${protocol}://${address}:${port}`;
}

function isUnixSock(address: ListeningAddress) {
  return address.addressType === -1;
}
