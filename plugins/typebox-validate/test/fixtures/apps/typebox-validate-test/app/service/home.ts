import { Service } from 'egg';
import { Static, Type } from '../../../../../../src/typebox.js';
import { Validate } from '../../../../../../src/decorator.js';
import { TYPEBOX_BODY } from '../controller/home.js';

type HomeTypeBoxType = Static<typeof TYPEBOX_BODY>;
type ServiceParamsType = Pick<HomeTypeBoxType, 'version'>;
const ServiceParamsBox = Type.Pick(TYPEBOX_BODY, ['version']);

export default class HomeService extends Service {
  @Validate([[ServiceParamsBox, (_, args) => args[0]]])
  public async index(p: ServiceParamsType): Promise<string> {
    return p.version || '';
  }
}
