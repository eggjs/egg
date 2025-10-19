import { Prototype, Inject } from '@eggjs/core-decorator';

@Prototype()
export default class testService {
  @Inject()
  invalidateService: any;
}
