import { field, fromJS, Model } from '../index';

interface Location {
  name: string;
  street: string;
  city: string;
  province: string;
}

class User extends Model {
  @field public email?: string;
  @field public firstName?: string;
  @field public lastName?: string;
  @field public locations?: Location[];
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
