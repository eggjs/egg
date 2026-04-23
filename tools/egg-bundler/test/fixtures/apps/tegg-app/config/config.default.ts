interface TeggAppConfig {
  keys: string;
  security: { csrf: { enable: boolean } };
}

export default (): TeggAppConfig => {
  return {
    keys: 'tegg-app-keys',
    security: {
      csrf: {
        enable: false,
      },
    },
  };
};
