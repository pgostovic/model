import { field, fromJS, IData, Model } from '..';

interface IUserData extends IData {
  email?: string;
  firstName?: string;
  lastName?: string;
  locations: ILocation[];
}

interface ILocation extends IData {
  name: string;
  street: string;
  city: string;
  province: string;
}

class User extends Model<IUserData> {
  @field public email?: string;
  @field public firstName?: string;
  @field public lastName?: string;
  @field public locations?: ILocation[];
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
  const userFromJS = fromJS(userJS) as User;

  expect(userFromJS).toBeInstanceOf(User);
  expect(userFromJS).not.toBe(user);
  expect(userFromJS).toEqual(user);
  expect(userFromJS.locations).not.toBe(user.locations);
  expect(userFromJS.locations).toEqual(user.locations);
});
