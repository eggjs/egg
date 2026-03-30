import path from 'node:path';

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
}

export interface SnapshotEggOptions {
  /** specify framework that can be absolute path or npm package */
  framework?: string;
  /** directory of application, default to `process.cwd()` */
  baseDir?: string;
  env?: string;
  plugins?: EggPlugin;
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

  const agent = new AgentClass({
    ...options,
  }) as SingleModeAgent;
  await agent.ready();
  const application = new ApplicationClass({
    ...options,
  }) as SingleModeApplication;
  application.agent = agent;
  agent.application = application;
  await application.ready();

  // emit egg-ready message in agent and application
  application.messenger.broadcast('egg-ready');
  return application;
}

/**
 * Load egg application metadata for V8 startup snapshot construction.
 *
 * This runs the loading phases (configWillLoad, configDidLoad, didLoad) but
 * stops before willReady/didReady/serverDidReady. No servers, timers,
 * file watchers, or connections are created.
 *
 * The returned application has all metadata loaded: plugins, configs,
 * extensions, services, controllers, router, and (if present) tegg modules.
 */
export async function startEggForSnapshot(options: SnapshotEggOptions = {}): Promise<SingleModeApplication> {
  options.baseDir = options.baseDir ?? process.cwd();

  // get framework from options or package.json
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

  const agent = new AgentClass({
    ...options,
    mode: 'single',
    snapshot: true,
  }) as SingleModeAgent;
  await agent.ready();

  const application = new ApplicationClass({
    ...options,
    mode: 'single',
    snapshot: true,
  }) as SingleModeApplication;
  application.agent = agent;
  agent.application = application;
  await application.ready();

  return application;
}
