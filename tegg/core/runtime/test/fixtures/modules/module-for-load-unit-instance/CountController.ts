import { AccessLevel } from '@eggjs/tegg-types';
import { ContextProto, Inject } from '@eggjs/core-decorator';
import CountService from './CountService.js';
import TempObj from './TempObj.js';

interface CountResult {
  serviceCount: number;
  serviceTempCount: number;
  controllerTempCount: number;
  // traceId: string;
}

@ContextProto({
  accessLevel: AccessLevel.PUBLIC,
})
export default class CountController {
  @Inject()
  countService: CountService;

  @Inject()
  tempObj: TempObj;

  async getCount(): Promise<CountResult> {
    const count = await this.countService.getCount();
    const serviceTempCount = await this.countService.getTempCount();
    return {
      serviceCount: count,
      serviceTempCount,
      controllerTempCount: await this.tempObj.getCount(),
    };
  }
}
