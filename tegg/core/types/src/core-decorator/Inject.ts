export interface InjectParams {
  // obj instance name, default is property name
  name?: string;
  // optional inject, default is false which means it will throw error when there is no relative object
  optional?: boolean;
}
