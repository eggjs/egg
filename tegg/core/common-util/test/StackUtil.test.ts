import { describe, expect, it } from 'vitest';

import { StackUtil } from '../src/index.ts';

// Helper functions to create predictable stack frames
function helperGetStack(withLine?: boolean, stackIndex?: number) {
  return StackUtil.getCalleeFromStack(withLine, stackIndex);
}

function nestedHelper1() {
  return nestedHelper2();
}

function nestedHelper2() {
  return nestedHelper3();
}

function nestedHelper3() {
  // Default stackIndex (2) should point to nestedHelper2
  return StackUtil.getCalleeFromStack(true);
}

// don't run on windows, because the file path is suck
// D:/a/egg/egg/tegg/core/common-util/test/StackUtil.test.ts
describe.skipIf(process.platform === 'win32')('test/StackUtil.test.ts', () => {
  describe('getCalleeFromStack()', () => {
    it('should get caller file name without line number', () => {
      // Use a helper function to create a predictable stack
      const callerFile = helperGetStack(false);
      expect(callerFile).toMatch(/StackUtil\.test\.ts$/);
      expect(callerFile).not.toContain(':');
    });

    it('should get caller file name with line number', () => {
      // Use a helper function to create a predictable stack
      const callerFile = helperGetStack(true);
      expect(callerFile).toContain('StackUtil.test.ts');
      expect(callerFile).toContain(':');
      // Should have format: filename:line:column
      const parts = callerFile.split(':');
      expect(parts.length).toBeGreaterThanOrEqual(3);
      const lineNumber = parseInt(parts[parts.length - 2]);
      const columnNumber = parseInt(parts[parts.length - 1]);
      expect(lineNumber).not.toBeNaN();
      expect(columnNumber).not.toBeNaN();
    });

    it('should get caller file name with custom stack index', () => {
      // Test that different stack indices return different frames
      const callerFile2 = helperGetStack(false, 2);
      const callerFile3 = helperGetStack(false, 3);
      const callerFile4 = helperGetStack(false, 4);

      // At least one of them should be our test file
      const hasTestFile =
        callerFile2.endsWith('StackUtil.test.ts') ||
        callerFile3.endsWith('StackUtil.test.ts') ||
        callerFile4.endsWith('StackUtil.test.ts');
      expect(hasTestFile).toBe(true);
    });

    it('should work with nested function calls', () => {
      const callerFile = nestedHelper1();
      expect(callerFile).toContain('StackUtil.test.ts');
      expect(callerFile).toContain(':');
    });

    it('should return <anonymous> for invalid stack index', () => {
      // Using a very large stack index that doesn't exist via helper
      const callerFile = helperGetStack(false, 999);
      expect(callerFile).toBe('<anonymous>');
    });

    it('should work with different stack depths', () => {
      function deeplyNested() {
        function level1() {
          function level2() {
            function level3() {
              // stackIndex 2 points to level2
              // stackIndex 3 points to level1
              // stackIndex 4 points to deeplyNested
              return StackUtil.getCalleeFromStack(true, 4);
            }
            return level3();
          }
          return level2();
        }
        return level1();
      }

      const callerFile = deeplyNested();
      expect(callerFile).toContain('StackUtil.test.ts');
      expect(callerFile).toContain(':');
    });

    it('should handle default stackIndex parameter', () => {
      const callerFile1 = helperGetStack();
      const callerFile2 = helperGetStack(false, undefined);
      const callerFile3 = helperGetStack(false, 2);

      // All should return similar results (same file)
      expect(callerFile1).toMatch(/StackUtil\.test\.ts$/);
      expect(callerFile2).toMatch(/StackUtil\.test\.ts$/);
      expect(callerFile3).toMatch(/StackUtil\.test\.ts$/);
    });

    it('should get absolute file path', () => {
      const callerFile = helperGetStack();
      // Should be an absolute path (Unix or Windows)
      expect(callerFile).toMatch(/^(\/|[A-Z]:\\)/);
    });

    it('should format with line and column correctly', () => {
      const callerFileWithLine = helperGetStack(true);
      const callerFileWithoutLine = helperGetStack(false);

      // With line should contain the file path from without line
      expect(callerFileWithLine.startsWith(callerFileWithoutLine)).toBe(true);

      // Extract and validate line and column numbers
      const suffix = callerFileWithLine.slice(callerFileWithoutLine.length);
      expect(suffix).toMatch(/^:\d+:\d+$/);
    });

    it('should handle consecutive calls from same location', () => {
      const call1 = helperGetStack(true);
      const call2 = helperGetStack(true);

      // Both calls should return the same file
      const file1 = call1.split(':').slice(0, -2).join(':');
      const file2 = call2.split(':').slice(0, -2).join(':');
      expect(file1).toBe(file2);

      // Line numbers should be different (consecutive lines)
      const line1 = parseInt(call1.split(':').slice(-2)[0]);
      const line2 = parseInt(call2.split(':').slice(-2)[0]);
      expect(line2).toBe(line1 + 1);
    });

    it('should work when called from arrow functions', () => {
      const arrowFunction = () => {
        return StackUtil.getCalleeFromStack(true);
      };

      const callerFile = arrowFunction();
      expect(callerFile).toContain('StackUtil.test.ts');
      expect(callerFile).toContain(':');
    });

    it('should work when called from class methods', () => {
      class TestClass {
        getStack() {
          return StackUtil.getCalleeFromStack(true);
        }
      }

      const instance = new TestClass();
      const callerFile = instance.getStack();
      expect(callerFile).toContain('StackUtil.test.ts');
      expect(callerFile).toContain(':');
    });

    it('should work when called from static methods', () => {
      class TestClass {
        static getStack() {
          return StackUtil.getCalleeFromStack(true);
        }
      }

      const callerFile = TestClass.getStack();
      expect(callerFile).toContain('StackUtil.test.ts');
      expect(callerFile).toContain(':');
    });
  });
});
