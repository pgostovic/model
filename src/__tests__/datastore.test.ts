// tslint:disable: max-classes-per-file
import { memoryDataStore } from '../datastores/memoryDataStore';
import { noOpDataStore } from '../datastores/noOpDataStore';
import { datastore, find, IModel, Model, search, setDefaultDataStore } from '../index';

interface IUserData extends IModel {
  email?: string;
  firstName?: string;
  lastName?: string;
  stuff?: {
    foo: number;
  };
}

setDefaultDataStore(memoryDataStore);

class User extends Model<IUserData> {
  public email?: string;
  public firstName?: string;
  public lastName?: string;
  public stuff?: { foo: number };
}

@datastore(noOpDataStore)
class UserNoOp extends Model<IUserData> {
  public email?: string;
  public firstName?: string;
  public lastName?: string;
  public stuff?: { foo: number };
}

test('save model instance', async () => {
  const user = new User({
    email: 'user@test.com',
    firstName: 'Bubba',
    lastName: 'Gump',
  });

  expect(user.id).toBeUndefined();
  const savedUser = await user.save();
  expect(savedUser).toBe(user);
  expect(savedUser.id).not.toBeUndefined();
});

test('save frozen model instance', async () => {
  const user = new User({
    email: 'user@test.com',
    firstName: 'Bubba',
    lastName: 'Gump',
  }).freeze();

  expect(user.id).toBeUndefined();
  const savedUser = await user.save();
  expect(savedUser).not.toBe(user);
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

test('search by multiple fields', async () => {
  const jed = new User({
    email: 'jed@test.com',
    firstName: 'Jed',
    lastName: 'Smith',
  });
  await jed.save();

  const paddy = new User({
    email: 'paddy@test.com',
    firstName: 'Paddy',
    lastName: 'Smith',
  });
  await paddy.save();

  const larry = new User({
    email: 'larry@test.com',
    firstName: 'Larry',
    lastName: 'Jones',
  });
  await larry.save();

  const jedSmiths = await search(User, {
    firstName: 'Jed',
    lastName: 'Smith',
  });
  expect(jedSmiths.length).toBe(1);
});

test('deep search', async () => {
  const bubba = new User({
    email: 'bubba@cheese.com',
    firstName: 'Bubba',
    lastName: 'Cheese',
    stuff: {
      foo: 42,
    },
  });
  await bubba.save();

  const bubba42s = await search(User, {
    stuff: { foo: 42 },
  });
  expect(bubba42s.length).toBe(1);

  const bubba43s = await search(User, {
    stuff: { foo: 43 },
  });
  expect(bubba43s.length).toBe(0);
});

test('datastore decorator', async () => {
  const noSave = new UserNoOp({ firstName: 'No', lastName: 'Save' });
  try {
    await noSave.save();
    fail('Should have thrown');
  } catch (err) {
    expect(err).toBeInstanceOf(Error);
  }
});
