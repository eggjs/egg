/**
 * Abstract interface for writing SSE events.
 * Decouples AgentRuntime from HTTP transport details.
 */
export interface SSEWriter {
  /** Write an SSE event with the given name and JSON-serializable data. */
  writeEvent(event: string, data: unknown): void;
  /** Whether the underlying connection has been closed. */
  readonly closed: boolean;
  /** End the SSE stream. */
  end(): void;
  /** Register a callback for when the client disconnects. */
  onClose(callback: () => void): void;
}
