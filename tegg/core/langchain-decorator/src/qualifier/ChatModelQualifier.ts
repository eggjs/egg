import { QualifierUtil } from '@eggjs/core-decorator';

export const ChatModelQualifierAttribute = Symbol.for('Qualifier.ChatModel');
export const ChatModelInjectName = 'chatModel';

export function ChatModelQualifier(chatModelName: string) {
  return function (target: any, propertyKey?: PropertyKey, parameterIndex?: number) {
    QualifierUtil.addInjectQualifier(target, propertyKey, parameterIndex, ChatModelQualifierAttribute, chatModelName);
  };
}
