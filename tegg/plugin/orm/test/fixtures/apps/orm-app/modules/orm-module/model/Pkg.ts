import { Attribute, Model } from '@eggjs/tegg-orm-decorator';
import Realm from 'leoric';

const Bone = Realm.Bone;
const DataTypes = Realm.DataTypes;

@Model({
  dataSource: 'test',
})
export class Pkg extends Bone {
  @Attribute(DataTypes.STRING)
  name: string;
  @Attribute(DataTypes.STRING)
  desc: string;

  static beforeCreate(instance: Pkg) {
    instance.name += '_before_create_hook';
  }
}
