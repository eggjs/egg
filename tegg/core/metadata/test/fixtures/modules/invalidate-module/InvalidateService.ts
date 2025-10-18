import { Prototype, Inject } from '@eggjs/core-decorator';

interface PersistenceService {}

@Prototype()
export default class InvalidateService {
  @Inject()
  persistenceService: PersistenceService;
}
