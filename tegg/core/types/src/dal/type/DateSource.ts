export interface PaginateData<T> {
  total: number;
  pageNum: number;
  rows: Array<T>;
}

export interface DataSource<T> {
  execute(sqlName: string, data?: any): Promise<Array<T>>;
  executeScalar(sqlName: string, data?: any): Promise<T | null>;
  executeRaw(sqlName: string, data?: any): Promise<Array<any>>;
  executeRawScalar(sqlName: string, data?: any): Promise<any | null>;
  paginate(sqlName: string, data: any, currentPage: number, perPageCount: number): Promise<PaginateData<T>>;
  count(sqlName: string, data?: any): Promise<number>;
}
