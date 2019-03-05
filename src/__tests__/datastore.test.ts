import {
  datastore,
  field,
  find,
  IData,
  memoryDataStore,
  Model,
  search,
} from '../index.server';

interface IUserData extends IData {
  email?: string;
  firstName?: string;
  lastName?: string;
}

@datastore(memoryDataStore, 'users')
class User extends Model<IUserData, User> {
  @field public email?: string;
  @field public firstName?: string;
  @field public lastName?: string;
}

test('save model instance', async () => {
  const user = new User({
    email: 'user@test.com',
    firstName: 'Bubba',
    lastName: 'Gump',
  });

  expect(user.id).toBeUndefined();
  const savedUser = await user.save();
  expect(savedUser.id).not.toBeUndefined();
});

test('find model instance', async () => {
  const user = new User({
    email: 'user@test.com',
    firstName: 'Bubba',
    lastName: 'Gump',
  });

  const savedUser = await user.save();
  expect(savedUser.id).not.toBeUndefined();

  if (savedUser.id) {
    const foundUser = await find(User, savedUser.id);
    expect(foundUser).not.toBeUndefined();

    if (foundUser) {
      expect(foundUser).toBeInstanceOf(User);
      expect(foundUser.email).toBe('user@test.com');
    }
  }
});

test('search for model instances', async () => {
  const fred = new User({
    email: 'fred@test.com',
    firstName: 'Fred',
    lastName: 'Smith',
  });
  await fred.save();

  const tom = new User({
    email: 'tom@test.com',
    firstName: 'Tom',
    lastName: 'Smith',
  });
  await tom.save();

  const bill = new User({
    email: 'bill@test.com',
    firstName: 'Bill',
    lastName: 'Jones',
  });
  await bill.save();

  const smiths = await search(User, { lastName: 'Smith' });
  expect(smiths.length).toBe(2);

  const emails = new Set(smiths.map(smith => smith.email));
  expect(emails.has('fred@test.com')).toBe(true);
  expect(emails.has('tom@test.com')).toBe(true);
  expect(emails.has('bill@test.com')).toBe(false);
});
