export default () => {
  const config = {
    keys: 'test key',
    security: {
      csrf: {
        ignoreJSON: false,
      },
    },
    orm: {
      datasources: [
        {
          client: 'mysql2',
          database: 'test',
          host: '127.0.0.1',
          port: 3306,
          user: 'root',

          delegate: 'model',
          baseDir: 'model',
          migrations: 'database',

          define: {
            underscored: true,
          },
        },
        {
          client: 'mysql2',
          database: 'apple',
          host: '127.0.0.1',
          port: 3306,
          user: 'root',

          delegate: 'model',
          baseDir: 'model',
          migrations: 'database',

          define: {
            underscored: true,
          },
        },
        {
          client: 'mysql2',
          database: 'banana',
          host: '127.0.0.1',
          port: 3306,
          user: 'root',

          delegate: 'model',
          baseDir: 'model',
          migrations: 'database',

          define: {
            underscored: true,
          },
        },
      ],
    },
  };
  return config;
};
