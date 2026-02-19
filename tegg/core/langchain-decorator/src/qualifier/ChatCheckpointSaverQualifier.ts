import { QualifierUtil } from '@eggjs/core-decorator';

export const ChatCheckpointSaverQualifierAttribute = Symbol.for('Qualifier.ChatCheckpointSaver');
export const ChatCheckpointSaverInjectName = 'chatCheckpointSaver';

export function ChatCheckpointSaverQualifier(chatCheckpointSaverName: string) {
  return function (target: any, propertyKey?: PropertyKey, parameterIndex?: number) {
    QualifierUtil.addInjectQualifier(
      target,
      propertyKey,
      parameterIndex,
      ChatCheckpointSaverQualifierAttribute,
      chatCheckpointSaverName,
    );
  };
}
