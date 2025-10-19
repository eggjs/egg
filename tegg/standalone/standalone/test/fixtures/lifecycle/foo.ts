import {
  SingletonProto,
  LifecyclePreLoad,
  LifecyclePostConstruct,
  LifecyclePreInject,
  LifecyclePostInject,
  LifecycleInit,
  LifecyclePreDestroy,
  LifecycleDestroy,
} from '@eggjs/tegg';
import { Runner, type MainRunner } from '@eggjs/tegg/standalone';

@Runner()
@SingletonProto()
export class Foo implements MainRunner<string[]> {
  static staticCalled: string[] = [];

  getLifecycleCalled(): string[] {
    return Foo.staticCalled;
  }

  @LifecyclePreLoad()
  static async _preLoad(): Promise<void> {
    Foo.staticCalled.push('preLoad');
  }

  constructor() {
    Foo.staticCalled.push('construct');
  }

  @LifecyclePostConstruct()
  protected async _postConstruct(): Promise<void> {
    Foo.staticCalled.push('postConstruct');
  }

  @LifecyclePreInject()
  protected async _preInject(): Promise<void> {
    Foo.staticCalled.push('preInject');
  }

  @LifecyclePostInject()
  protected async _postInject(): Promise<void> {
    Foo.staticCalled.push('postInject');
  }

  protected async init(): Promise<void> {
    Foo.staticCalled.push('init should not called');
  }

  @LifecycleInit()
  protected async _init(): Promise<void> {
    Foo.staticCalled.push('init');
  }

  @LifecyclePreDestroy()
  protected async _preDestroy(): Promise<void> {
    Foo.staticCalled.push('preDestroy');
  }

  @LifecycleDestroy()
  protected async _destroy(): Promise<void> {
    Foo.staticCalled.push('destroy');
  }

  async main(): Promise<string[]> {
    return Foo.staticCalled;
  }
}
