import type { Geometry, GeometryCollection } from '@eggjs/tegg-types';
import { ColumnType } from '@eggjs/tegg-types';

export class SpatialHelper {
  static isPoint(t: Geometry): boolean {
    return typeof Reflect.get(t, 'x') === 'number' && typeof Reflect.get(t, 'y') === 'number';
  }

  static isLine(t: Geometry): boolean {
    return Array.isArray(t) && t[0] && SpatialHelper.isPoint(t[0]);
  }

  static isPolygon(t: Geometry): boolean {
    return Array.isArray(t) && t[0] && SpatialHelper.isLine(t[0]);
  }

  static getGeometryType(t: Geometry): ColumnType {
    if (SpatialHelper.isPoint(t)) {
      return ColumnType.POINT;
    } else if (SpatialHelper.isLine(t)) {
      return ColumnType.LINESTRING;
    }
    return ColumnType.POLYGON;
  }

  static isMultiPoint(t: GeometryCollection): boolean {
    return Array.isArray(t) && t[0] && SpatialHelper.isPoint(t[0]);
  }

  static isMultiLine(t: GeometryCollection): boolean {
    return Array.isArray(t) && t[0] && SpatialHelper.isLine(t[0]);
  }

  static isMultiPolygon(t: GeometryCollection): boolean {
    return Array.isArray(t) && t[0] && SpatialHelper.isPolygon(t[0]);
  }
}
