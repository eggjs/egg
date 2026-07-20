function Framework(): ClassDecorator {
  return () => undefined;
}

@Framework()
class DecoratedFramework {}

export async function loadMetadata(appDir: string) {
  return {
    appDir,
    decoratedFramework: DecoratedFramework.name,
    scannerPid: process.pid,
  };
}
