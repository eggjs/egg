import type { MainRunnerClass } from '../typing.js';
import { StandaloneUtil } from '../util/index.js';

export function Runner<T>() {
  return function (clazz: MainRunnerClass<T>) {
    StandaloneUtil.setMainRunner(clazz as unknown as MainRunnerClass<void>);
  };
}
