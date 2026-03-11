// ===== Content block types =====

export const ContentBlockType = {
  Text: 'text',
} as const;
export type ContentBlockType = (typeof ContentBlockType)[keyof typeof ContentBlockType];

// ===== Content types =====

export interface InputContentPart {
  type: typeof ContentBlockType.Text;
  text: string;
}

export interface TextContentBlock {
  type: typeof ContentBlockType.Text;
  text: { value: string; annotations: unknown[] };
}

export type MessageContentBlock = TextContentBlock;

// ===== Input / Output message types =====

export interface InputMessage {
  role: string;
  content: string | { type: string; text: string }[];
  metadata?: Record<string, unknown>;
}

export interface MessageObject {
  id: string;
  object: string;
  createdAt: number;
  role: string;
  status: string;
  content: MessageContentBlock[];
  runId?: string;
  threadId?: string;
}
