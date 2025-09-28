import { default as TsHelper, TsGenConfig, TsHelperConfig } from '../core';

export interface GeneratorResult {
  dist: string;
  content?: string;
}

export abstract class BaseGenerator<T = any> {
  constructor(
    public baseConfig: TsHelperConfig,
    public tsHelper: TsHelper,
  ) {}

  render(config: TsGenConfig) {
    const params = this.buildParams(config);
    return this.renderWithParams(config, params);
  }

  // build render params
  abstract buildParams(config: TsGenConfig): T;

  // render with params
  abstract renderWithParams(config: TsGenConfig, params: T): GeneratorResult;
}
