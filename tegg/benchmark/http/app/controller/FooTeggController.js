var __decorate =
  (this && this.__decorate) ||
  function (decorators, target, key, desc) {
    var c = arguments.length,
      r = c < 3 ? target : desc === null ? (desc = Object.getOwnPropertyDescriptor(target, key)) : desc,
      d;
    if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
      r = Reflect.decorate(decorators, target, key, desc);
    else
      for (var i = decorators.length - 1; i >= 0; i--)
        if ((d = decorators[i])) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
  };
var __metadata =
  (this && this.__metadata) ||
  function (k, v) {
    if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function') return Reflect.metadata(k, v);
  };
import { HTTPController, HTTPMethod, HTTPMethodEnum } from 'egg';
import pkg from 'egg/package.json' with { type: 'json' };
let FooTeggController = class FooTeggController {
  async hello() {
    return `hello, tegg@${pkg.version}`;
  }
};
__decorate(
  [
    HTTPMethod({
      method: HTTPMethodEnum.GET,
      path: '/hello-tegg',
    }),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', []),
    __metadata('design:returntype', Promise),
  ],
  FooTeggController.prototype,
  'hello',
  null,
);
FooTeggController = __decorate([HTTPController()], FooTeggController);
export default FooTeggController;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRm9vVGVnZ0NvbnRyb2xsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJGb29UZWdnQ29udHJvbGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQSxPQUFPLEVBQUUsY0FBYyxFQUFFLFVBQVUsRUFBRSxjQUFjLEVBQUUsTUFBTSxLQUFLLENBQUM7QUFDakUsT0FBTyxHQUFHLE1BQU0sa0JBQWtCLENBQUMsT0FBTyxJQUFJLEVBQUUsTUFBTSxFQUFFLENBQUM7QUFHMUMsSUFBTSxpQkFBaUIsR0FBdkIsTUFBTSxpQkFBaUI7SUFLOUIsQUFBTixLQUFLLENBQUMsS0FBSztRQUNULE9BQU8sZUFBZSxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDdEMsQ0FBQztDQUNGLENBQUE7QUFITztJQUpMLFVBQVUsQ0FBQztRQUNWLE1BQU0sRUFBRSxjQUFjLENBQUMsR0FBRztRQUMxQixJQUFJLEVBQUUsYUFBYTtLQUNwQixDQUFDOzs7OzhDQUdEO0FBUGtCLGlCQUFpQjtJQURyQyxjQUFjLEVBQUU7R0FDSSxpQkFBaUIsQ0FRckM7ZUFSb0IsaUJBQWlCIn0=
