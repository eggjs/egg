import csp from "./csp.ts";
import csrf from "./csrf.ts";
import dta from "./dta.ts";
import hsts from "./hsts.ts";
import methodnoallow from "./methodnoallow.ts";
import noopen from "./noopen.ts";
import nosniff from "./nosniff.ts";
import referrerPolicy from "./referrerPolicy.ts";
import xframe from "./xframe.ts";
import xssProtection from "./xssProtection.ts";

const middlewares: {
  csp: typeof csp;
  csrf: typeof csrf;
  dta: typeof dta;
  hsts: typeof hsts;
  methodnoallow: typeof methodnoallow;
  noopen: typeof noopen;
  nosniff: typeof nosniff;
  referrerPolicy: typeof referrerPolicy;
  xframe: typeof xframe;
  xssProtection: typeof xssProtection;
} = {
  csp,
  csrf,
  dta,
  hsts,
  methodnoallow,
  noopen,
  nosniff,
  referrerPolicy,
  xframe,
  xssProtection,
};

export default middlewares;
