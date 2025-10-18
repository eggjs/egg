import { SingletonProto, Inject, InjectOptional } from '@eggjs/tegg';

@SingletonProto()
export class FooService {
  constructor(
    @Inject({ optional: true }) readonly doesNotExist1?: object,
    @InjectOptional() readonly doesNotExist2?: object
  ) {}

  foo() {
    return {
      nil1: this.doesNotExist1 ? 'N' : 'Y',
      nil2: this.doesNotExist2 ? 'N' : 'Y',
    };
  }
}
