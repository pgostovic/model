import Model, { field, fromJS, IData } from '../model';

interface IUserData extends IData {
  email?: string;
  firstName?: string;
  lastName?: string;
}

class User extends Model<IUserData> {
  @field public email?: string;
  @field public firstName?: string;
  @field public lastName?: string;
}

User.register();

test('serialize/deserialize', () => {
  const user = new User({
    email: 'bubba@gump.com',
    firstName: 'Bubba',
    lastName: 'Gump',
  });

  const userJS = user.toJS();
  const userFromJS = fromJS(userJS) as User;

  expect(userFromJS).toBeInstanceOf(User);
  expect(userFromJS.email).toBe(user.email);
  expect(userFromJS.firstName).toBe(user.firstName);
  expect(userFromJS.lastName).toBe(user.lastName);
});
