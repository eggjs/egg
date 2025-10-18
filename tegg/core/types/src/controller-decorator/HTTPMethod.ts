import { HTTPMethodEnum } from './model/index.ts';

export interface HTTPMethodParams {
  method: HTTPMethodEnum;
  path: string;
  priority?: number;
}
