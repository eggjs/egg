import path from 'node:path';

import { ColumnModel, SpatialHelper } from '@eggjs/dal-decorator';
import { ColumnType } from '@eggjs/tegg-types';
import type {
  Geometry,
  GeometryCollection,
  Line,
  MultiLine,
  MultiPoint,
  MultiPolygon,
  Point,
  Polygon,
} from '@eggjs/tegg-types';

export class TemplateUtil {
  static isSpatialType(columnModel: ColumnModel): boolean {
    switch (columnModel.type.type) {
      case ColumnType.GEOMETRY:
      case ColumnType.POINT:
      case ColumnType.LINESTRING:
      case ColumnType.POLYGON:
      case ColumnType.MULTIPOINT:
      case ColumnType.MULTILINESTRING:
      case ColumnType.MULTIPOLYGON:
      case ColumnType.GEOMETRYCOLLECTION: {
        return true;
      }
      default: {
        return false;
      }
    }
  }

  static importPath(tableModelPath: string, currentPath: string) {
    return path.relative(currentPath, tableModelPath);
  }

  static dbTypeToTsType(columnType: ColumnType): string {
    return `ColumnTsType['${columnType}']`;
  }

  static toJson(value: any): string {
    return JSON.stringify(JSON.stringify(value));
  }

  static toPoint(point: Point): string {
    if (typeof point.x !== 'number' || typeof point.y !== 'number') {
      throw new Error(`invalidate point ${JSON.stringify(point)}`);
    }
    return `Point(${point.x}, ${point.y})`;
  }
  static toLine(val: Line): string {
    const points = val.map(t => TemplateUtil.toPoint(t));
    return `LINESTRING(${points.join(',')})`;
  }
  static toPolygon(val: Polygon): string {
    const lines = val.map(t => TemplateUtil.toLine(t));
    return `POLYGON(${lines.join(',')})`;
  }
  static toGeometry(val: Geometry): string {
    const type = SpatialHelper.getGeometryType(val);
    const filterName = TemplateUtil.getSpatialFilter(type);
    return (TemplateUtil as any)[filterName](val);
  }
  static toMultiPoint(val: MultiPoint): string {
    const points = val.map(t => TemplateUtil.toPoint(t));
    return `MULTIPOINT(${points.join(',')})`;
  }
  static toMultiLine(val: MultiLine): string {
    const lines = val.map(t => TemplateUtil.toLine(t));
    return `MULTILINESTRING(${lines.join(',')})`;
  }
  static toMultiPolygon(val: MultiPolygon): string {
    const polygon = val.map(t => TemplateUtil.toPolygon(t));
    return `MULTIPOLYGON(${polygon.join(',')})`;
  }
  static toGeometryCollection(val: GeometryCollection): string {
    const geometries = val.map(t => {
      return TemplateUtil.toGeometry(t);
    });
    return `GEOMETRYCOLLECTION(${geometries.join(',')})`;
  }

  static spatialFilter = {
    [ColumnType.POINT]: 'toPoint',
    [ColumnType.LINESTRING]: 'toLine',
    [ColumnType.POLYGON]: 'toPolygon',
    [ColumnType.GEOMETRY]: 'toGeometry',
    [ColumnType.MULTIPOINT]: 'toMultiPoint',
    [ColumnType.MULTILINESTRING]: 'toMultiLine',
    [ColumnType.MULTIPOLYGON]: 'toMultiPolygon',
    [ColumnType.GEOMETRYCOLLECTION]: 'toGeometryCollection',
  } as Record<ColumnType, string>;

  static getSpatialFilter(columnType: ColumnType) {
    const filter = TemplateUtil.spatialFilter[columnType];
    if (!filter) {
      throw new Error(`type ${columnType} is not spatial type`);
    }
    return filter;
  }
}
