import { QualifierUtil } from '@eggjs/core-decorator';

export const ChatCheckpointSaverQualifierAttribute: symbol = Symbol.for('Qualifier.ChatCheckpointSaver');
export const ChatCheckpointSaverInjectName = 'chatCheckpointSaver';

export function ChatCheckpointSaverQualifier(
  chatCheckpointSaverName: string,
): (target: any, propertyKey?: PropertyKey, parameterIndex?: number) => void {
  return function (target: any, propertyKey?: PropertyKey, parameterIndex?: number): void {
    QualifierUtil.addInjectQualifier(
      target,
      propertyKey,
      parameterIndex,
      ChatCheckpointSaverQualifierAttribute,
      chatCheckpointSaverName,
    );
  };
}
