export function mergeHeaders(...headersInits: Array<HeadersInit | undefined>): HeadersInit {
  const res: Record<string, string | null> = {};
  for (const headersInit of headersInits) {
    if (!headersInit) continue;
    // Use global Headers (Node.js 22+) to avoid type mismatch with undici's HeadersInit
    const headers = new globalThis.Headers(headersInit);
    for (const key of headers.keys()) {
      res[key] = headers.get(key);
    }
  }
  return res as Record<string, string>;
}
