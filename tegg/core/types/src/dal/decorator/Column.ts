import type { ColumnFormat, ColumnType } from '../enum/index.ts';

export interface ColumnParams {
  name?: string;
  default?: string;
  canNull?: boolean;
  comment?: string;
  visible?: boolean;
  autoIncrement?: boolean;
  uniqueKey?: boolean;
  primaryKey?: boolean;
  collate?: string;
  columnFormat?: ColumnFormat;
  engineAttribute?: string;
  secondaryEngineAttribute?: string;
}

export interface IColumnTypeParams {
  type: ColumnType;
}

export interface BitParams extends IColumnTypeParams {
  type: ColumnType.BIT;
  length?: number;
}

export interface BoolParams extends IColumnTypeParams {
  type: ColumnType.BOOL;
}

interface BaseNumericParams extends IColumnTypeParams {
  length?: number;
  unsigned?: boolean;
  zeroFill?: boolean;
}

interface BaseFloatNumericParams extends IColumnTypeParams {
  length?: number;
  fractionalLength?: number;
  unsigned?: boolean;
  zeroFill?: boolean;
}

export interface TinyIntParams extends BaseNumericParams {
  type: ColumnType.TINYINT;
}

export interface SmallIntParams extends BaseNumericParams {
  type: ColumnType.SMALLINT;
}

export interface MediumIntParams extends BaseNumericParams {
  type: ColumnType.MEDIUMINT;
}

export interface IntParams extends BaseNumericParams {
  type: ColumnType.INT;
}

export interface BigIntParams extends BaseNumericParams {
  type: ColumnType.BIGINT;
}

export interface DecimalParams extends BaseFloatNumericParams {
  type: ColumnType.DECIMAL;
}

export interface FloatParams extends BaseFloatNumericParams {
  type: ColumnType.FLOAT;
}

export interface DoubleParams extends BaseFloatNumericParams {
  type: ColumnType.DOUBLE;
}

export interface DateParams extends IColumnTypeParams {
  type: ColumnType.DATE;
}

export interface DateTimeParams extends IColumnTypeParams {
  type: ColumnType.DATETIME;
  precision?: number;
  autoUpdate?: boolean;
}

export interface TimestampParams extends IColumnTypeParams {
  type: ColumnType.TIMESTAMP;
  precision?: number;
  autoUpdate?: boolean;
}

export interface TimeParams extends IColumnTypeParams {
  type: ColumnType.TIME;
  precision?: number;
}

export interface YearParams extends IColumnTypeParams {
  type: ColumnType.YEAR;
}

export interface CharParams extends IColumnTypeParams {
  type: ColumnType.CHAR;
  length?: number;
  characterSet?: string;
  collate?: string;
}

export interface VarCharParams extends IColumnTypeParams {
  type: ColumnType.VARCHAR;
  length: number;
  characterSet?: string;
  collate?: string;
}

export interface BinaryParams extends IColumnTypeParams {
  type: ColumnType.BINARY;
  length?: number;
}

export interface VarBinaryParams extends IColumnTypeParams {
  type: ColumnType.VARBINARY;
  length: number;
}

export interface TinyBlobParams extends IColumnTypeParams {
  type: ColumnType.TINYBLOB;
}

export interface TinyTextParams extends IColumnTypeParams {
  type: ColumnType.TINYTEXT;
  characterSet?: string;
  collate?: string;
}

export interface BlobParams extends IColumnTypeParams {
  type: ColumnType.BLOB;
  length?: number;
}

export interface TextParams extends IColumnTypeParams {
  type: ColumnType.TEXT;
  length?: number;
  characterSet?: string;
  collate?: string;
}

export interface MediumBlobParams extends IColumnTypeParams {
  type: ColumnType.MEDIUMBLOB;
}

export interface LongBlobParams extends IColumnTypeParams {
  type: ColumnType.LONGBLOB;
}

export interface MediumTextParams extends IColumnTypeParams {
  type: ColumnType.MEDIUMTEXT;
  characterSet?: string;
  collate?: string;
}

export interface LongTextParams extends IColumnTypeParams {
  type: ColumnType.LONGTEXT;
  characterSet?: string;
  collate?: string;
}

export interface EnumParams extends IColumnTypeParams {
  type: ColumnType.ENUM;
  enums: string[];
  characterSet?: string;
  collate?: string;
}

export interface SetParams extends IColumnTypeParams {
  type: ColumnType.SET;
  enums: string[];
  characterSet?: string;
  collate?: string;
}

export interface JsonParams extends IColumnTypeParams {
  type: ColumnType.JSON;
}

export interface BaseSpatialParams extends IColumnTypeParams {
  SRID?: number;
}

export interface GeometryParams extends BaseSpatialParams {
  type: ColumnType.GEOMETRY;
}

export interface PointParams extends BaseSpatialParams {
  type: ColumnType.POINT;
}

export interface LinestringParams extends BaseSpatialParams {
  type: ColumnType.LINESTRING;
}

export interface PolygonParams extends BaseSpatialParams {
  type: ColumnType.POLYGON;
}

export interface MultiPointParams extends BaseSpatialParams {
  type: ColumnType.MULTIPOINT;
}

export interface MultiLinestringParams extends BaseSpatialParams {
  type: ColumnType.MULTILINESTRING;
}

export interface MultiPolygonParams extends BaseSpatialParams {
  type: ColumnType.MULTIPOLYGON;
}

export interface GeometryCollectionParams extends BaseSpatialParams {
  type: ColumnType.GEOMETRYCOLLECTION;
}

export type ColumnTypeParams =
  | BitParams
  | BoolParams
  | TinyIntParams
  | SmallIntParams
  | MediumIntParams
  | IntParams
  | BigIntParams
  | DecimalParams
  | FloatParams
  | DoubleParams
  | DateParams
  | DateTimeParams
  | TimestampParams
  | TimeParams
  | YearParams
  | CharParams
  | VarCharParams
  | BinaryParams
  | VarBinaryParams
  | TinyBlobParams
  | TinyTextParams
  | BlobParams
  | TextParams
  | MediumBlobParams
  | MediumTextParams
  | LongBlobParams
  | LongTextParams
  | EnumParams
  | SetParams
  | JsonParams
  | GeometryParams
  | PointParams
  | LinestringParams
  | PolygonParams
  | MultiPointParams
  | MultiLinestringParams
  | MultiPolygonParams
  | GeometryCollectionParams;
