import path from 'node:path';

import { ManifestStore } from '@eggjs/core';
import { importModule } from '@eggjs/utils';
import { readJSON } from 'utility';

import { Agent } from './agent.ts';
import { Application } from './application.ts';
import { type EggPlugin } from './types.ts';

export interface StartEggOptions {
  /** specify framework that can be absolute path or npm package */
  framework?: string;
  /** directory of application, default to `process.cwd()` */
  baseDir?: string;
  /** ignore single process mode warning */
  ignoreWarning?: boolean;
  mode?: 'single';
  env?: string;
  plugins?: EggPlugin;
  /** Skip lifecycle hooks, only trigger loadMetadata for manifest generation */
  metadataOnly?: boolean;
}

export interface SingleModeApplication extends Application {
  agent: SingleModeAgent;
}

export interface SingleModeAgent extends Agent {
  app: SingleModeApplication;
}

/**
 * Start egg with single process
 */
export async function startEgg(options: StartEggOptions = {}): Promise<SingleModeApplication> {
  options.baseDir = options.baseDir ?? process.cwd();
  options.mode = 'single';
  ManifestStore.enableCompileCache(options.baseDir);

  // get agent from options.framework and package.egg.framework
  if (!options.framework) {
    try {
      const pkg = await readJSON(path.join(options.baseDir, 'package.json'));
      options.framework = pkg.egg.framework;
    } catch {
      // ignore
    }
  }
  let AgentClass = Agent;
  let ApplicationClass = Application;
  if (options.framework) {
    const framework = await importModule(options.framework, {
      paths: [options.baseDir],
    });
    AgentClass = framework.Agent;
    ApplicationClass = framework.Application;
  }

  // In metadataOnly mode, skip agent entirely — only app metadata is needed
  let agent: SingleModeAgent | undefined;
  if (!options.metadataOnly) {
    agent = new AgentClass({
      ...options,
    }) as SingleModeAgent;
    await agent.ready();
  }

  const application = new ApplicationClass({
    ...options,
  }) as SingleModeApplication;
  if (agent) {
    application.agent = agent;
    agent.application = application;
  }
  await application.ready();

  if (!options.metadataOnly) {
    // emit egg-ready message in agent and application
    application.messenger.broadcast('egg-ready');
  }
  return application;
}
