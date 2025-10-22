export class AttributeMeta {
  readonly dataType: string;
  readonly propertyName: string;
  readonly attributeName: string;
  readonly allowNull: boolean;
  readonly autoIncrement: boolean;
  readonly primary: boolean;
  readonly unique: boolean;

  constructor(
    dataType: string,
    propertyName: string,
    attributeName: string,
    allowNull: boolean,
    autoIncrement: boolean,
    primary: boolean,
    unique: boolean,
  ) {
    this.dataType = dataType;
    this.propertyName = propertyName;
    this.attributeName = attributeName;
    this.allowNull = allowNull;
    this.autoIncrement = autoIncrement;
    this.primary = primary;
    this.unique = unique;
  }
}
