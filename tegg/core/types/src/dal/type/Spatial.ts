export interface Point {
  x: number;
  y: number;
}

export type Line = Array<Point>;
export type Polygon = Array<Line>;
export type Geometry = Point | Line | Polygon;

export type MultiPoint = Array<Point>;
export type MultiLine = Array<Line>;
export type MultiPolygon = Array<Polygon>;
export type GeometryCollection = Array<Point | Line | Polygon>;
