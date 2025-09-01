import { Master, MasterOptions } from './master.js';
import { ClusterOptions, ClusterHTTPSSecureOptions, ClusterStartMode } from './utils/options.js';

/**
 * cluster start flow:
 *
 * [startCluster] -> master -> agent_worker -> new [Agent]       -> agentWorkerLoader
 *                         `-> app_worker   -> new [Application] -> appWorkerLoader
 *
 */

/**
 * start egg app
 * @function Egg#startCluster
 * @param {Object} options {@link Master}
 */
export async function startCluster(options: ClusterOptions) {
  await new Master(options).ready();
}

export {
  Master, MasterOptions,
  ClusterOptions, ClusterHTTPSSecureOptions, ClusterStartMode,
};

export * from './error/index.js';
