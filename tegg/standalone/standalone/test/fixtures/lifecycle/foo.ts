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

  getLifecycleCalled() {
    return Foo.staticCalled;
  }

  @LifecyclePreLoad()
  static async _preLoad() {
    Foo.staticCalled.push('preLoad');
  }

  constructor() {
    Foo.staticCalled.push('construct');
  }

  @LifecyclePostConstruct()
  protected async _postConstruct() {
    Foo.staticCalled.push('postConstruct');
  }

  @LifecyclePreInject()
  protected async _preInject() {
    Foo.staticCalled.push('preInject');
  }

  @LifecyclePostInject()
  protected async _postInject() {
    Foo.staticCalled.push('postInject');
  }

  protected async init() {
    Foo.staticCalled.push('init should not called');
  }

  @LifecycleInit()
  protected async _init() {
    Foo.staticCalled.push('init');
  }

  @LifecyclePreDestroy()
  protected async _preDestroy() {
    Foo.staticCalled.push('preDestroy');
  }

  @LifecycleDestroy()
  protected async _destroy() {
    Foo.staticCalled.push('destroy');
  }

  async main(): Promise<string[]> {
    return Foo.staticCalled;
  }
}
