import { BaseContextClass, EggCore } from '../../..';

// normal
const app = new EggCore<{ env: string }>();
console.info(app.abb);
console.info(app.Controller.abc);
console.info(app.Service.bbc);
console.info(app.config.env);
console.info(app.config.env.substring(0));
console.info(app.config.env.checkEnvType());
app.loader.loadPlugin();
app.loader.loadConfig();
app.loader.loadApplicationExtend();
app.loader.loadAgentExtend();
app.loader.loadRequestExtend();
app.loader.loadResponseExtend();
app.loader.loadContextExtend();
app.loader.loadHelperExtend();
app.loader.loadCustomAgent();
app.loader.loadService();
app.loader.loadController();
app.loader.loadRouter();
app.loader.loadMiddleware();
new BaseContextClass({ app: {} }).ctx;
