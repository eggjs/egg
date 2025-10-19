import type { MainRunnerClass } from '../typing.ts';

export class StandaloneUtil {
  private static runnerClass: MainRunnerClass | undefined;

  static setMainRunner(runnerClass: MainRunnerClass): void {
    StandaloneUtil.runnerClass = runnerClass;
  }

  static getMainRunner(): MainRunnerClass | undefined {
    return StandaloneUtil.runnerClass;
  }
}
