import AuditLogger from '../AuditLogger';
import { addPersistObserver } from '../Datastore';
import { memoryDataStore } from '../datastores/MemoryDataStore';
import { noOpDataStore } from '../datastores/noOpDataStore';
import { datastore, field, find, Model, search, setDefaultDataStore } from '../index';

const auditLogger = new AuditLogger();
addPersistObserver(auditLogger);

setDefaultDataStore(memoryDataStore);

class User extends Model {
  @field public email: string;
  @field public firstName: string;
  @field public lastName: string;
  @field public stuff?: { foo: number };

  constructor({ email, firstName, lastName }: { email: string; firstName: string; lastName: string }) {
    super();
    this.email = email;
    this.firstName = firstName;
    this.lastName = lastName;
  }
}

@datastore(noOpDataStore)
class UserNoOp extends Model {
  @field public email: string;
  @field public firstName: string;
  @field public lastName: string;
  @field public stuff?: { foo: number };

  constructor({ email, firstName, lastName }: { email: string; firstName: string; lastName: string }) {
    super();
    this.email = email;
    this.firstName = firstName;
    this.lastName = lastName;
  }
}

afterAll(() => {
  auditLogger.reconstruct();
});

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
  fred.stuff = { foo: 5 };
  await fred.save();

  const tom = new User({
    email: 'tom@test.com',
    firstName: 'Tom',
    lastName: 'Smith',
  });
  tom.stuff = { foo: 5 };
  await tom.save();

  const bill = new User({
    email: 'bill@test.com',
    firstName: 'Bill',
    lastName: 'Jones',
  });
  bill.stuff = { foo: 7 };
  await bill.save();

  const smiths = await search(User, { lastName: 'Smith' }).all();
  expect(smiths.length).toBe(2);

  const emails = new Set(smiths.map(smith => smith.email));
  expect(emails.has('fred@test.com')).toBe(true);
  expect(emails.has('tom@test.com')).toBe(true);
  expect(emails.has('bill@test.com')).toBe(false);

  smiths.forEach(smith => {
    expect(smith.stuff).toEqual({ foo: 5 });
  });
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
  }).all();
  expect(jedSmiths.length).toBe(1);
});

test('deep search', async () => {
  const bubba = new User({
    email: 'bubba@cheese.com',
    firstName: 'Bubba',
    lastName: 'Cheese',
  });
  bubba.stuff = { foo: 42 };
  await bubba.save();

  const bubba42s = await search(User, {
    stuff: { foo: 42 },
  }).all();
  expect(bubba42s.length).toBe(1);

  const bubba43s = await search(User, {
    stuff: { foo: 43 },
  }).all();
  expect(bubba43s.length).toBe(0);
});

test('save new with id', async () => {
  const bubba = new User({
    email: 'bubba@cheese.com',
    firstName: 'Bubba',
    lastName: 'Cheese',
  });
  bubba.id = 'abcd1234';
  bubba.stuff = { foo: 42 };
  await bubba.save();

  const foundUser = await find(User, bubba.id);
  expect(foundUser).not.toBeUndefined();
});

test('datastore decorator', async () => {
  const noSave = new UserNoOp({ email: 'user@test.com', firstName: 'No', lastName: 'Save' });
  try {
    await noSave.save();
    fail('Should have thrown');
  } catch (err) {
    expect(err).toBeInstanceOf(Error);
  }
});
