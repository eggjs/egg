interface LoggerTransport {
  options: {
    file: string;
  };
}

/**
 * Walk all logger files from loggers
 */
export function walkLoggerFile(loggers: Record<string, Map<string, LoggerTransport>>) {
  const files: string[] = [];
  for (const registeredLogger of Object.values(loggers)) {
    for (const transport of registeredLogger.values()) {
      const file = transport.options.file;
      if (file) {
        files.push(file);
      }
    }
  }
  return files;
}
