import assert from 'node:assert/strict';

import { PrototypeUtil } from '@eggjs/core-decorator';
import { describe, it } from 'vitest';

// Import fixtures so decorators run and register metadata
import './fixtures/apps/simple-app/app/module/user/UserController.ts';
import { MethodAnalyzer } from '../src/MethodAnalyzer.ts';
// Multi-module fixtures (for pure-method test)
import { BarController } from './fixtures/apps/multi-module-app/app/module/bar/BarController.ts';
// Private method chain fixtures
import { ApiController } from './fixtures/apps/private-method-app/app/module/api/ApiController.ts';
import { UserController } from './fixtures/apps/simple-app/app/module/user/UserController.ts';

describe('MethodAnalyzer', () => {
  const analyzer = new MethodAnalyzer();

  it('should find only userService access in getUser method', () => {
    const filePath = PrototypeUtil.getFilePath(UserController);
    assert(filePath, 'UserController file path should be set by decorator');

    const accessed = analyzer.analyze(filePath, 'UserController', 'getUser');

    assert(accessed.has('userService'), 'getUser should access userService');
    assert(!accessed.has('adminService'), 'getUser should NOT access adminService');
  });

  it('should find both userService and adminService in adminAction method', () => {
    const filePath = PrototypeUtil.getFilePath(UserController);
    assert(filePath, 'UserController file path should be set by decorator');

    const accessed = analyzer.analyze(filePath, 'UserController', 'adminAction');

    assert(accessed.has('userService'), 'adminAction should access userService');
    assert(accessed.has('adminService'), 'adminAction should access adminService');
  });

  it('should return empty set for non-existent method', () => {
    const filePath = PrototypeUtil.getFilePath(UserController);
    assert(filePath, 'UserController file path should be set by decorator');

    const accessed = analyzer.analyze(filePath, 'UserController', 'nonExistentMethod');

    assert.equal(accessed.size, 0);
  });

  it('should return empty set for non-existent class', () => {
    const filePath = PrototypeUtil.getFilePath(UserController);
    assert(filePath);

    const accessed = analyzer.analyze(filePath, 'NonExistentClass', 'getUser');

    assert.equal(accessed.size, 0);
  });

  describe('private method chain (#privateMethod)', () => {
    it('should follow #loadUser() and detect userService for getProfile', () => {
      const filePath = PrototypeUtil.getFilePath(ApiController);
      assert(filePath, 'ApiController file path should be set by decorator');

      const accessed = analyzer.analyze(filePath, 'ApiController', 'getProfile');

      assert(accessed.has('userService'), 'getProfile should detect userService via #loadUser()');
      assert(!accessed.has('orderService'), 'getProfile should NOT detect orderService');
    });

    it('should follow #loadOrder() and detect orderService for getOrder', () => {
      const filePath = PrototypeUtil.getFilePath(ApiController);
      assert(filePath, 'ApiController file path should be set by decorator');

      const accessed = analyzer.analyze(filePath, 'ApiController', 'getOrder');

      assert(accessed.has('orderService'), 'getOrder should detect orderService via #loadOrder()');
      assert(!accessed.has('userService'), 'getOrder should NOT detect userService');
    });

    it('should detect both services in getSummary (direct access, no private methods)', () => {
      const filePath = PrototypeUtil.getFilePath(ApiController);
      assert(filePath, 'ApiController file path should be set by decorator');

      const accessed = analyzer.analyze(filePath, 'ApiController', 'getSummary');

      assert(accessed.has('userService'), 'getSummary should access userService directly');
      assert(accessed.has('orderService'), 'getSummary should access orderService directly');
    });
  });

  describe('pure method (no service access)', () => {
    it('should return empty set for healthCheck which accesses no services', () => {
      const filePath = PrototypeUtil.getFilePath(BarController);
      assert(filePath, 'BarController file path should be set by decorator');

      const accessed = analyzer.analyze(filePath, 'BarController', 'healthCheck');

      assert.equal(accessed.size, 0, 'healthCheck should access no services');
    });
  });
});
