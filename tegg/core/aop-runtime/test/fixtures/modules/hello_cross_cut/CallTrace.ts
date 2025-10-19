import { AccessLevel, SingletonProto } from '@eggjs/core-decorator';

export interface CallTraceMsg {
  className: string;
  methodName: string;
  id: number;
  name: string;
  result?: string;
  adviceParams?: any;
}

@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class CallTrace {
  msgs: Array<CallTraceMsg> = [];

  addMsg(msg: CallTraceMsg): void {
    this.msgs.push(msg);
  }
}
