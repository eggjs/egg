CREATE TABLE IF NOT EXISTS multi_primary_key_table (
  id_1 INT NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT 'the primary key',
  id_2 INT NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT 'the primary key',
  name VARCHAR(100) NOT NULL UNIQUE KEY
) COMMENT='multi primary key table';