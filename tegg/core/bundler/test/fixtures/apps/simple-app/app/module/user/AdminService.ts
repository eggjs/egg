import { SingletonProto, AccessLevel } from '@eggjs/core-decorator';

@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class AdminService {
  async doAdminAction(): Promise<string> {
    return 'admin action done';
  }

  async listAdmins(): Promise<string[]> {
    return ['admin1', 'admin2'];
  }
}
