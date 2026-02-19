import { ChatModelInjectName, ChatModelQualifierAttribute } from '@eggjs/langchain-decorator';

export class ChatModelHelper {
  static getChatModelQualifier(clientName: string) {
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
