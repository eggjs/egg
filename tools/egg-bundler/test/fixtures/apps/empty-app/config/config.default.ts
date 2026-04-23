interface EmptyAppConfig {
  keys: string;
}

export default (): EmptyAppConfig => {
  return {
    keys: 'empty-app-keys',
  };
};
