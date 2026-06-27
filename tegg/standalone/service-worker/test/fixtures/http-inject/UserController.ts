import {
  HTTPController,
  HTTPMethod,
  HTTPMethodEnum,
  HTTPParam,
  Inject,
} from '@eggjs/tegg';
import { UserService } from './UserService.ts';

@HTTPController({
  path: '/api/users',
})
export class UserController {
  @Inject()
  private readonly userService: UserService;

  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/' })
  async list() {
    return await this.userService.list();
  }

  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/:id' })
  async findById(@HTTPParam() id: string) {
    return await this.userService.findById(id);
  }
}
