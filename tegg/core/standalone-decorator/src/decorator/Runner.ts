import type { MainRunnerClass } from '../typing.ts';
import { StandaloneUtil } from '../util/index.ts';

export function Runner<T>() {
  return function (clazz: MainRunnerClass<T>): void {
    StandaloneUtil.setMainRunner(clazz as unknown as MainRunnerClass<void>);
  };
}
