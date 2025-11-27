import ExtendContext from './context';
import ExtendHelper from './helper';

declare module 'egg' {
  type ExtendHelperType = typeof ExtendHelper;
  type ExtendContextType = typeof ExtendContext;
  interface IHelper extends ExtendHelperType {}
  interface Context extends ExtendContextType {}
}
