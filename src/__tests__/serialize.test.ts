import { fromJS, IModel, Model } from '../index.server';

interface IUserData extends IModel {
  email?: string;
  firstName?: string;
  lastName?: string;
  locations: ILocation[];
}

interface ILocation {
  name: string;
  street: string;
  city: string;
  province: string;
}

class User extends Model<IUserData> {
  public email?: string;
  public firstName?: string;
  public lastName?: string;
  public locations?: ILocation[];
}

User.register();

test('serialize/deserialize', () => {
  const user = new User({
    email: 'bubba@gump.com',
    firstName: 'Bubba',
    lastName: 'Gump',
    locations: [
      {
        name: 'home',
        street: '123 Orchard Ave.',
        city: 'Toronto',
        province: 'Ontario',
      },
      {
        name: 'work',
        street: '555 Main St.',
        city: 'Toronto',
        province: 'Ontario',
      },
    ],
  });

  const userJS = user.toJS();
  const userFromJS = fromJS<User>(userJS);

  expect(userFromJS).toBeInstanceOf(User);
  expect(userFromJS).not.toBe(user);
  expect(userFromJS).toEqual(user);
  expect(userFromJS.locations).not.toBe(user.locations);
  expect(userFromJS.locations).toEqual(user.locations);
});
