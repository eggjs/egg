import { Prototype, Inject } from '@eggjs/core-decorator';
import AppRepo from './AppRepo.ts';

@Prototype()
export default class UserRepo {
  @Inject()
  appRepo: AppRepo;
}
