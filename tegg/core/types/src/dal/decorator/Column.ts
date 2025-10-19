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
  type: typeof ColumnType.BIT;
  length?: number;
}

export interface BoolParams extends IColumnTypeParams {
  type: typeof ColumnType.BOOL;
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
  type: typeof ColumnType.TINYINT;
}

export interface SmallIntParams extends BaseNumericParams {
  type: typeof ColumnType.SMALLINT;
}

export interface MediumIntParams extends BaseNumericParams {
  type: typeof ColumnType.MEDIUMINT;
}

export interface IntParams extends BaseNumericParams {
  type: typeof ColumnType.INT;
}

export interface BigIntParams extends BaseNumericParams {
  type: typeof ColumnType.BIGINT;
}

export interface DecimalParams extends BaseFloatNumericParams {
  type: typeof ColumnType.DECIMAL;
}

export interface FloatParams extends BaseFloatNumericParams {
  type: typeof ColumnType.FLOAT;
}

export interface DoubleParams extends BaseFloatNumericParams {
  type: typeof ColumnType.DOUBLE;
}

export interface DateParams extends IColumnTypeParams {
  type: typeof ColumnType.DATE;
}

export interface DateTimeParams extends IColumnTypeParams {
  type: typeof ColumnType.DATETIME;
  precision?: number;
  autoUpdate?: boolean;
}

export interface TimestampParams extends IColumnTypeParams {
  type: typeof ColumnType.TIMESTAMP;
  precision?: number;
  autoUpdate?: boolean;
}

export interface TimeParams extends IColumnTypeParams {
  type: typeof ColumnType.TIME;
  precision?: number;
}

export interface YearParams extends IColumnTypeParams {
  type: typeof ColumnType.YEAR;
}

export interface CharParams extends IColumnTypeParams {
  type: typeof ColumnType.CHAR;
  length?: number;
  characterSet?: string;
  collate?: string;
}

export interface VarCharParams extends IColumnTypeParams {
  type: typeof ColumnType.VARCHAR;
  length: number;
  characterSet?: string;
  collate?: string;
}

export interface BinaryParams extends IColumnTypeParams {
  type: typeof ColumnType.BINARY;
  length?: number;
}

export interface VarBinaryParams extends IColumnTypeParams {
  type: typeof ColumnType.VARBINARY;
  length: number;
}

export interface TinyBlobParams extends IColumnTypeParams {
  type: typeof ColumnType.TINYBLOB;
}

export interface TinyTextParams extends IColumnTypeParams {
  type: typeof ColumnType.TINYTEXT;
  characterSet?: string;
  collate?: string;
}

export interface BlobParams extends IColumnTypeParams {
  type: typeof ColumnType.BLOB;
  length?: number;
}

export interface TextParams extends IColumnTypeParams {
  type: typeof ColumnType.TEXT;
  length?: number;
  characterSet?: string;
  collate?: string;
}

export interface MediumBlobParams extends IColumnTypeParams {
  type: typeof ColumnType.MEDIUMBLOB;
}

export interface LongBlobParams extends IColumnTypeParams {
  type: typeof ColumnType.LONGBLOB;
}

export interface MediumTextParams extends IColumnTypeParams {
  type: typeof ColumnType.MEDIUMTEXT;
  characterSet?: string;
  collate?: string;
}

export interface LongTextParams extends IColumnTypeParams {
  type: typeof ColumnType.LONGTEXT;
  characterSet?: string;
  collate?: string;
}

export interface EnumParams extends IColumnTypeParams {
  type: typeof ColumnType.ENUM;
  enums: string[];
  characterSet?: string;
  collate?: string;
}

export interface SetParams extends IColumnTypeParams {
  type: typeof ColumnType.SET;
  enums: string[];
  characterSet?: string;
  collate?: string;
}

export interface JsonParams extends IColumnTypeParams {
  type: typeof ColumnType.JSON;
}

export interface BaseSpatialParams extends IColumnTypeParams {
  SRID?: number;
}

export interface GeometryParams extends BaseSpatialParams {
  type: typeof ColumnType.GEOMETRY;
}

export interface PointParams extends BaseSpatialParams {
  type: typeof ColumnType.POINT;
}

export interface LinestringParams extends BaseSpatialParams {
  type: typeof ColumnType.LINESTRING;
}

export interface PolygonParams extends BaseSpatialParams {
  type: typeof ColumnType.POLYGON;
}

export interface MultiPointParams extends BaseSpatialParams {
  type: typeof ColumnType.MULTIPOINT;
}

export interface MultiLinestringParams extends BaseSpatialParams {
  type: typeof ColumnType.MULTILINESTRING;
}

export interface MultiPolygonParams extends BaseSpatialParams {
  type: typeof ColumnType.MULTIPOLYGON;
}

export interface GeometryCollectionParams extends BaseSpatialParams {
  type: typeof ColumnType.GEOMETRYCOLLECTION;
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
