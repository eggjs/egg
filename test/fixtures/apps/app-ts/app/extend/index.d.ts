import ExtendHelper from './helper';
import ExtendContext from './context';

declare module 'egg' {
  type ExtendHelperType = typeof ExtendHelper;
  type ExtendContextType = typeof ExtendContext;
  interface IHelper extends ExtendHelperType { }
  interface Context extends ExtendContextType { }
}
