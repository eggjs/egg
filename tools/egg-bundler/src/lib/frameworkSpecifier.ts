import path from 'node:path';

const URL_SCHEME_RE = /^[a-zA-Z][a-zA-Z\d+.-]*:/;
const WINDOWS_ABSOLUTE_RE = /^[a-zA-Z]:[\\/]/;

function isPathLikeFrameworkSpecifier(framework: string): boolean {
  return (
    framework === '.' ||
    framework === '..' ||
    framework.startsWith('./') ||
    framework.startsWith('../') ||
    framework.startsWith('.\\') ||
    framework.startsWith('..\\') ||
    framework.startsWith('/') ||
    framework.startsWith('\\') ||
    framework.includes('\\') ||
    path.isAbsolute(framework) ||
    WINDOWS_ABSOLUTE_RE.test(framework) ||
    URL_SCHEME_RE.test(framework)
  );
}

export function assertFrameworkPackageSpecifier(framework: string): void {
  if (!framework || isPathLikeFrameworkSpecifier(framework)) {
    throw new Error(
      `[@eggjs/egg-bundler] framework must be a package specifier for bundled runtime, got path-like value: ${framework}`,
    );
  }
}
