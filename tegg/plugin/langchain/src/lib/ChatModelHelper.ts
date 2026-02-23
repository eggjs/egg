import { ChatModelInjectName, ChatModelQualifierAttribute } from '@eggjs/langchain-decorator';

export class ChatModelHelper {
  static getChatModelQualifier(clientName: string): Record<string, Array<{ attribute: symbol; value: string }>> {
    return {
      [ChatModelInjectName]: [
        {
          attribute: ChatModelQualifierAttribute,
          value: clientName,
        },
      ],
    };
  }
}
