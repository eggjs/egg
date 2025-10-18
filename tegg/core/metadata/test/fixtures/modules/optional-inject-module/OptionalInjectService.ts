import { Inject, InjectOptional, SingletonProto } from '@eggjs/core-decorator';

interface PersistenceService {}

@SingletonProto()
export default class OptionalInjectService {
  @Inject({ optional: true })
  persistenceService?: PersistenceService;

  @InjectOptional()
  persistenceService2?: PersistenceService;
}
