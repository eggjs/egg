import { SingletonProto, Inject, InjectOptional } from '@eggjs/tegg';

@SingletonProto()
export class FooService {
  constructor(
    // @ts-expect-error readonly property in constructor
    @Inject({ optional: true }) readonly doesNotExist1?: object,
    // @ts-expect-error readonly property in constructor
    @InjectOptional() readonly doesNotExist2?: object,
  ) {}

  foo(): { nil1: string; nil2: string } {
    return {
      nil1: this.doesNotExist1 ? 'N' : 'Y',
      nil2: this.doesNotExist2 ? 'N' : 'Y',
    };
  }
}
