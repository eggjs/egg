import { TsGenConfig, TsHelperConfig } from '..';
import * as utils from '../utils';
import ClassGenerator from './class.js';

export default function ObjectGenerator(config: TsGenConfig, baseConfig: TsHelperConfig) {
  config.interfaceHandle = config.interfaceHandle || 'typeof {{ 0 }}';
  return ClassGenerator(config, baseConfig);
}

ObjectGenerator.defaultConfig = utils.extend({}, ClassGenerator.defaultConfig);
