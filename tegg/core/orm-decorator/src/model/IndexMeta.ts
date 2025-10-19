export class IndexMeta {
  readonly name: string;
  readonly fields: string[];
  readonly unique: boolean;
  readonly primary: boolean;

  constructor(name: string, fields: string[], unique: boolean, primary: boolean) {
    this.name = name;
    this.fields = fields;
    this.unique = unique;
    this.primary = primary;
  }
}
