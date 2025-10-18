import type { MainRunnerClass } from '../typing.js';

export class StandaloneUtil {
  private static runnerClass: MainRunnerClass | undefined;

  static setMainRunner(runnerClass: MainRunnerClass) {
    StandaloneUtil.runnerClass = runnerClass;
  }

  static getMainRunner(): MainRunnerClass | undefined {
    return StandaloneUtil.runnerClass;
  }
}
