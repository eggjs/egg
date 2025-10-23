export default {
  redis: {
    enable: true,
    package: '@eggjs/redis',
  },
  // disable tegg plugins
  teggEventbus: false,
  tegg: false,
  teggConfig: false,
  teggController: false,
  teggDal: false,
  teggSchedule: false,
  teggOrm: false,
  teggAjv: false,
  teggAop: false,
};
