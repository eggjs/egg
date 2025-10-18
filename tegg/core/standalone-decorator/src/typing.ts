export interface MainRunner<T = void> {
  main(): Promise<T>;
}

export type MainRunnerClass<T = void> = new () => MainRunner<T>;
