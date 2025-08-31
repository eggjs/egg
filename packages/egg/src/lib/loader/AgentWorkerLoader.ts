import { EggApplicationLoader } from './EggApplicationLoader.js';

/**
 * Agent worker process loader
 * @see https://github.com/eggjs/egg-core/blob/master/src/loader/egg_loader.ts
 */
export class AgentWorkerLoader extends EggApplicationLoader {
  /**
   * loadPlugin first, then loadConfig
   */
  async loadConfig() {
    await this.loadPlugin();
    await super.loadConfig();
  }

  async load() {
    await this.loadAgentExtend();
    await this.loadContextExtend();
    await this.loadCustomAgent();
  }
}
