import { Master, type MasterOptions } from './master.ts';
import { type ClusterOptions, type ClusterHTTPSSecureOptions, type ClusterStartMode } from './utils/options.ts';

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
  Master, type MasterOptions,
  type ClusterOptions, type ClusterHTTPSSecureOptions, type ClusterStartMode,
};

export * from './error/index.ts';
