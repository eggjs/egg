import { Inject, SingletonProto, InjectOptional } from '@eggjs/tegg';

@SingletonProto()
export class Bar {
  constructor(
    @InjectOptional() readonly hello?: object,
    @Inject({ optional: true }) readonly world?: object
  ) {}
}
