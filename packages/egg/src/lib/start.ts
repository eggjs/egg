import path from 'node:path';

import { ManifestStore, type LoaderFS } from '@eggjs/core';
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
  /** Loader-facing filesystem abstraction */
  loaderFS?: LoaderFS;
  /**
   * When true, load application metadata for V8 startup snapshot construction.
   * The lifecycle stops after configWillLoad (no servers, timers, or connections)
   * and skips `egg-ready` broadcast. `ready()` resolves when loading completes.
   */
  snapshot?: boolean;
}

export interface SingleModeApplication extends Application {
  agent: SingleModeAgent;
}

export interface SingleModeAgent extends Agent {
  app: SingleModeApplication;
}

interface FrameworkClasses {
  AgentClass: typeof Agent;
  ApplicationClass: typeof Application;
}

async function resolveFrameworkClasses(options: { framework?: string; baseDir: string }): Promise<FrameworkClasses> {
  if (!options.framework) {
    try {
      const pkg = await readJSON(path.join(options.baseDir, 'package.json'));
      options.framework = pkg.egg.framework;
    } catch {
      // ignore
    }
  }
  let AgentClass: typeof Agent = Agent;
  let ApplicationClass: typeof Application = Application;
  if (options.framework) {
    const framework = await importModule(options.framework, {
      paths: [options.baseDir],
    });
    AgentClass = framework.Agent;
    ApplicationClass = framework.Application;
  }
  return { AgentClass, ApplicationClass };
}

/**
 * Start egg with single process.
 *
 * When `options.snapshot` is true, loads application metadata for V8 startup
 * snapshot construction. The lifecycle stops after `configWillLoad` (no servers,
 * timers, or connections) and skips `egg-ready` broadcast.
 */
export async function startEgg(options: StartEggOptions = {}): Promise<SingleModeApplication> {
  options.baseDir = options.baseDir ?? process.cwd();
  options.mode = 'single';

  if (!options.snapshot) {
    ManifestStore.enableCompileCache(options.baseDir);
  }

  const { AgentClass, ApplicationClass } = await resolveFrameworkClasses(
    options as { framework?: string; baseDir: string },
  );

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

  if (!options.metadataOnly && !options.snapshot) {
    // emit egg-ready message in agent and application
    application.messenger.broadcast('egg-ready');
  }
  return application;
}
