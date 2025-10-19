import type {
  Geometry,
  GeometryCollection,
  Line,
  MultiLine,
  MultiPoint,
  MultiPolygon,
  Point,
  Polygon,
} from './Spatial.ts';

export interface ColumnTsType {
  BIT: Buffer;
  TINYINT: number;
  BOOL: 0 | 1;
  SMALLINT: number;
  MEDIUMINT: number;
  INT: number;
  BIGINT: string;
  DECIMAL: string;
  FLOAT: number;
  DOUBLE: number;
  DATE: Date;
  DATETIME: Date;
  TIMESTAMP: Date;
  TIME: string;
  YEAR: number;
  CHAR: string;
  VARCHAR: string;
  BINARY: Buffer;
  VARBINARY: Buffer;
  TINYBLOB: Buffer;
  TINYTEXT: string;
  BLOB: Buffer;
  TEXT: string;
  MEDIUMBLOB: Buffer;
  MEDIUMTEXT: string;
  LONGBLOB: Buffer;
  LONGTEXT: string;
  ENUM: string;
  SET: string;
  JSON: object;
  GEOMETRY: Geometry;
  POINT: Point;
  LINESTRING: Line;
  POLYGON: Polygon;
  MULTIPOINT: MultiPoint;
  MULTILINESTRING: MultiLine;
  MULTIPOLYGON: MultiPolygon;
  GEOMETRYCOLLECTION: GeometryCollection;
}
