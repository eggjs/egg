import os from 'node:os';
import mysql from 'mysql2';

const config = {
  host: '127.0.0.1',
  port: 3306,
  password: '',
  user: 'root',
  database: '',
};

let connection;

function connect() {
  connection = mysql.createConnection(config);
  connection.connect();
}

async function query(sql) {
  return new Promise((resolve, reject) => {
    console.log('prepare database: ', sql);
    connection.query(sql, (err, res) => {
      if (err) {
        return reject(err);
      }
      return resolve(res);
    });
  });
}

async function init() {
  await query('DROP DATABASE IF EXISTS `test`;');
  await query('CREATE DATABASE test;');
  await query('DROP DATABASE IF EXISTS `apple`;');
  await query('CREATE DATABASE apple;');
  await query('DROP DATABASE IF EXISTS `banana`;');
  await query('CREATE DATABASE banana;');
  await query('use test;');
  await query(
    'CREATE TABLE `apps` (\n' +
      '  `id` bigint unsigned NOT NULL AUTO_INCREMENT,\n' +
      '  `name` varchar(100) NOT NULL,\n' +
      '  `desc` varchar(100) NOT NULL,\n' +
      '  PRIMARY KEY (`id`)\n' +
      ');'
  );
  await query(
    'CREATE TABLE `pkgs` (\n' +
      '  `id` bigint unsigned NOT NULL AUTO_INCREMENT,\n' +
      '  `name` varchar(100) NOT NULL,\n' +
      '  `desc` varchar(100) NOT NULL,\n' +
      '  PRIMARY KEY (`id`)\n' +
      ');'
  );
}

(async () => {
  try {
    // TODO win32 ci not support mysql
    if (['win32'].includes(os.platform())) {
      return;
    }
    connect();
    await init();
    console.log('prepare database done');
    process.exit(0);
  } catch (e) {
    console.log(e);
    process.exit(1);
  }
})();
