import type { BackgroundTaskHelper } from '@eggjs/background-task';
import { SingletonProto, Inject, InjectOptional } from '@eggjs/core-decorator';
import { AccessLevel } from '@eggjs/tegg-types';
import type { Logger } from '@eggjs/tegg-types';
import type { Run } from '@langchain/core/tracers/base';
import { getCustomLogger } from 'onelogger';

import { IOssClient } from './IOssClient.ts';
import { type AgentTracingConfig, FIELDS_TO_OSS, type IResource, RunStatus } from './types.ts';

/**
 * TracingService - Shared service for common tracing operations.
 * Used by both LangGraphTracer and ClaudeAgentTracer to avoid code duplication.
 */
@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class TracingService {
  @Inject()
  public readonly logger: Logger;

  @Inject()
  private backgroundTaskHelper: BackgroundTaskHelper;

  @InjectOptional()
  private readonly ossClient: IOssClient;

  private config: AgentTracingConfig = {};

  /**
   * Configure logService credentials.
   * Validates required fields.
   */
  configure(config: AgentTracingConfig): void {
    if (config.logService) {
      if (!config.logService.url) {
        throw new TypeError('[TracingService] logService config requires url');
      }
    }
    this.config = config;
  }

  /**
   * Get the current environment (local, pre, prod, gray)
   */
  getEnv(): string {
    const env = process.env.FAAS_ENV || process.env.SERVER_ENV || 'local';
    if (env === 'prepub') {
      return 'pre';
    }
    return env;
  }

  /**
   * Check if running in online environment (prod, pre, gray)
   */
  isOnlineEnv(): boolean {
    const env = this.getEnv();
    return ['prod', 'pre', 'gray'].includes(env);
  }

  /**
   * Generate log info prefix for a run
   */
  getLogInfoPrefix(run: Run, status: RunStatus, name: string): string {
    const env = this.getEnv();
    const envSegment = process.env.FAAS_ENV || env === 'local' ? '' : `env=${env},`;
    return (
      `[agent_run][${name}]:` +
      `traceId=${run.trace_id},` +
      `type=${run.parent_run_id ? 'child_run' : 'root_run'},` +
      `status=${status},` +
      `${envSegment}` +
      `run_id=${run.id},` +
      `parent_run_id=${run.parent_run_id ?? ''}`
    );
  }

  /**
   * Upload content to OSS using the injected IOssClient implementation.
   * Gracefully skips if no IOssClient is provided.
   */
  async uploadToOss(key: string, fileContent: string): Promise<void> {
    if (!this.ossClient) {
      this.logger.warn('[TracingService] OSS client not configured. Provide an IOssClient implementation.');
      return;
    }
    this.logger.info(`Uploading to OSS with key: ${key}`);
    await this.ossClient.put(key, Buffer.from(fileContent));
    this.logger.info(`Upload completed for key: ${key}`);
  }

  /**
   * Sync local tracing logs to a log service endpoint.
   * Configured via configure({ logService: { url, headers } }).
   * Silently skips if logService is not configured.
   */
  async syncLocalToLogService(log: string, agentName: string): Promise<void> {
    const logServiceConfig = this.config.logService;
    if (!logServiceConfig?.url) {
      return;
    }

    if (!agentName) {
      this.logger.warn('[TraceLogErr] syncLocalToLogService: agentName is empty');
      return;
    }

    try {
      await fetch(logServiceConfig.url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...logServiceConfig.headers,
        },
        body: JSON.stringify({
          log: `[${agentName}]${log}`,
        }),
      });
    } catch (e) {
      this.logger.warn('[TraceLogErr] syncLocalToLogService error:', e);
    }
  }

  /**
   * Log trace run data with OSS upload for large fields
   */
  logTrace(run: Run, status: RunStatus, name: string, agentName: string): void {
    try {
      const { child_runs: childs, ...runData } = run;
      if (runData.tags?.includes('langsmith:hidden')) {
        return;
      }

      const env = this.getEnv();
      FIELDS_TO_OSS.forEach((field) => {
        if (!runData[field]) {
          return;
        }
        const jsonstr = JSON.stringify(runData[field]);
        if (field === 'outputs') {
          (runData as any).cost = runData?.outputs?.llmOutput;
        }
        delete runData[field];
        const key = `agents/${name}/${env}/traces/${run.trace_id}/runs/${run.id}/${field}`;
        this.backgroundTaskHelper.run(async () => {
          try {
            await this.uploadToOss(key, jsonstr);
          } catch (e) {
            this.logger.warn(
              `[TraceLogErr] Failed to upload run data to OSS for run_id=${run.id}, field=${field}, error:`,
              e,
            );
          }
        });
        (runData as any)[field] = { compress: 'none', key } as IResource;
      });

      const runJSON = JSON.stringify({ ...runData, child_run_ids: childs?.map((child) => child.id) });
      const logInfo = this.getLogInfoPrefix(run, status, name) + `,run=${runJSON}`;

      if (process.env.FAAS_ENV) {
        this.logger.info(logInfo);
      } else {
        const logger = getCustomLogger('agentTraceLogger') || this.logger;
        logger.info(`[${agentName}]${logInfo}`);
      }

      if (env === 'local') {
        this.backgroundTaskHelper.run(async () => {
          await this.syncLocalToLogService(logInfo, agentName);
        });
      }
    } catch (e) {
      this.logger.warn('[TraceLogErr] logTrace error:', e);
    }
  }
}
