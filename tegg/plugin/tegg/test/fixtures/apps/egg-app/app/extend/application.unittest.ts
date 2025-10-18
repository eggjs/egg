import { type MockApplication } from '@eggjs/mock';

export default {
  mockUser(this: MockApplication) {
    this.mockContext({
      user: {
        userName: 'mock_user',
      },
    });
  },
};
