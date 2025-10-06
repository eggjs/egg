'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const egg_1 = require('egg');
class AppController extends egg_1.Controller {
  index() {
    try {
      throw new Error('some err');
    } catch (err) {
      this.ctx.logger.error(err);
      this.ctx.body = {
        msg: err.message,
        stack: err.stack,
      };
    }
  }
}
exports.default = AppController;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG9tZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImhvbWUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSw2QkFBaUM7QUFFakMsTUFBcUIsYUFBYyxTQUFRLGdCQUFVO0lBQzVDLEtBQUs7UUFDVixJQUFJLENBQUM7WUFDSCxNQUFNLElBQUksS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQzlCLENBQUM7UUFBQyxPQUFPLEdBQVEsRUFBRSxDQUFDO1lBQ2xCLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUMzQixJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksR0FBRztnQkFDZCxHQUFHLEVBQUUsR0FBRyxDQUFDLE9BQU87Z0JBQ2hCLEtBQUssRUFBRSxHQUFHLENBQUMsS0FBSzthQUNqQixDQUFDO1FBQ0osQ0FBQztJQUNILENBQUM7Q0FDRjtBQVpELGdDQVlDIn0=
