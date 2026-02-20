import { QualifierUtil } from '@eggjs/core-decorator';

export const ChatModelQualifierAttribute: symbol = Symbol.for('Qualifier.ChatModel');
export const ChatModelInjectName = 'chatModel';

export function ChatModelQualifier(
  chatModelName: string,
): (target: any, propertyKey?: PropertyKey, parameterIndex?: number) => void {
  return function (target: any, propertyKey?: PropertyKey, parameterIndex?: number): void {
    QualifierUtil.addInjectQualifier(target, propertyKey, parameterIndex, ChatModelQualifierAttribute, chatModelName);
  };
}
