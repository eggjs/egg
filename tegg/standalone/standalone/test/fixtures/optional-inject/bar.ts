import { Inject, SingletonProto, InjectOptional } from '@eggjs/tegg';

@SingletonProto()
export class Bar {
  constructor(
    // @ts-ignore
    @InjectOptional() readonly hello?: object,
    // @ts-ignore
    @Inject({ optional: true }) readonly world?: object
  ) {}
}
