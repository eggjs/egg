import path from 'node:path';
import { readJSON } from 'utility';
import { importModule } from '@eggjs/utils';
import { Agent } from './agent.js';
import { Application } from './application.js';

export interface StartEggOptions {
  /** specify framework that can be absolute path or npm package */
  framework?: string;
  /** directory of application, default to `process.cwd()` */
  baseDir?: string;
  /** ignore single process mode warning */
  ignoreWarning?: boolean;
  mode?: 'single';
  env?: string;
}

/**
 * Start egg with single process
 */
export async function startEgg(options: StartEggOptions = {}) {
  options.baseDir = options.baseDir ?? process.cwd();
  options.mode = 'single';

  // get agent from options.framework and package.egg.framework
  if (!options.framework) {
    try {
      const pkg = await readJSON(path.join(options.baseDir, 'package.json'));
      options.framework = pkg.egg.framework;
    } catch (_) {
      // ignore
    }
  }
  let AgentClass = Agent;
  let ApplicationClass = Application;
  if (options.framework) {
    const framework = await importModule(options.framework, { paths: [ options.baseDir ] });
    AgentClass = framework.Agent;
    ApplicationClass = framework.Application;
  }

  const agent = new AgentClass({
    ...options,
  });
  await agent.ready();
  const application = new ApplicationClass({
    ...options,
  });
  application.agent = agent;
  agent.application = application;
  await application.ready();

  // emit egg-ready message in agent and application
  application.messenger.broadcast('egg-ready');
  return application;
}
