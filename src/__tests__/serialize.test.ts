import { setDefaultDataStore } from '../DataStore';
import { memoryDataStore } from '../datastores/MemoryDataStore';
import { field, Model } from '../index';

setDefaultDataStore(memoryDataStore);

const idIterator = (function*(): IterableIterator<number> {
  let i = 0;
  while (true) {
    yield ++i;
  }
})();

interface Location {
  name: string;
  street: string;
  city: string;
  province: string;
}

class User extends Model {
  @field public email: string;
  @field public firstName: string;
  @field public lastName: string;
  @field public locations: Location[] = [];
  @field public readonly seq = idIterator.next().value;

  constructor({ email, firstName, lastName }: { email: string; firstName: string; lastName: string }) {
    super();
    this.email = email;
    this.firstName = firstName;
    this.lastName = lastName;
  }
}

User.register();

test('serialize/deserialize', () => {
  const user = new User({
    email: 'bubba@gump.com',
    firstName: 'Bubba',
    lastName: 'Gump',
  });

  user.locations.push({
    name: 'home',
    street: '123 Orchard Ave.',
    city: 'Toronto',
    province: 'Ontario',
  });

  user.locations.push({
    name: 'work',
    street: '555 Main St.',
    city: 'Toronto',
    province: 'Ontario',
  });

  const userJS = user.toJS();
  const userFromJS = Model.parse<User>(userJS);

  expect(userFromJS).toBeInstanceOf(User);
  expect(userFromJS).not.toBe(user);
  expect(userFromJS).toEqual(user);
  expect(userFromJS.locations).not.toBe(user.locations);
  expect(userFromJS.locations).toEqual(user.locations);
  expect(userFromJS.seq).toEqual(user.seq);
  expect(userFromJS.persisted).toBeUndefined();
});

test('serialize/deserialize persisted', async () => {
  const user = new User({
    email: 'bubba@gump.com',
    firstName: 'Bubba',
    lastName: 'Gump',
  });

  const savedUser = await user.save();

  const userJS = savedUser.toJS();
  const userFromJS = Model.parse<User>(userJS);

  expect(userFromJS).toBeInstanceOf(User);
  expect(userFromJS).not.toBe(user);
  expect(userFromJS).not.toBe(savedUser);
  expect(userFromJS).toEqual(savedUser);
  expect(userFromJS.persisted).not.toBeUndefined();
});

test('serialize/deserialize persisted JSON', async () => {
  const user = new User({
    email: 'bubba@gump.com',
    firstName: 'Bubba',
    lastName: 'Gump',
  });

  const savedUser = await user.save();
  const savedUserJSON = JSON.stringify(savedUser, null, 2);
  const userFromJS = Model.parse<User>(JSON.parse(savedUserJSON));

  expect(userFromJS).toBeInstanceOf(User);
  expect(userFromJS).not.toBe(user);
  expect(userFromJS).not.toBe(savedUser);
  expect(userFromJS).toEqual(savedUser);
});

test('serialize/deserialize JSON', () => {
  const user = new User({
    email: 'bubba@gump.com',
    firstName: 'Bubba',
    lastName: 'Gump',
  });

  user.locations.push({
    name: 'home',
    street: '123 Orchard Ave.',
    city: 'Toronto',
    province: 'Ontario',
  });

  user.locations.push({
    name: 'work',
    street: '555 Main St.',
    city: 'Toronto',
    province: 'Ontario',
  });

  const userJSON = JSON.stringify(user);
  const userFromJS = Model.parse<User>(JSON.parse(userJSON));

  expect(userFromJS).toBeInstanceOf(User);
  expect(userFromJS).not.toBe(user);
  expect(userFromJS).toEqual(user);
  expect(userFromJS.locations).not.toBe(user.locations);
  expect(userFromJS.locations).toEqual(user.locations);
  expect(userFromJS.seq).toEqual(user.seq);
  expect(userFromJS.persisted).toBeUndefined();
});

test('serialize/deserialize embedded JSON', () => {
  const user = new User({
    email: 'bubba@gump.com',
    firstName: 'Bubba',
    lastName: 'Gump',
  });

  user.locations.push({
    name: 'home',
    street: '123 Orchard Ave.',
    city: 'Toronto',
    province: 'Ontario',
  });

  user.locations.push({
    name: 'work',
    street: '555 Main St.',
    city: 'Toronto',
    province: 'Ontario',
  });

  const obj = {
    theStuff: {
      users: [42, user, 'hello'],
    },
  };

  const objJSON = JSON.stringify(obj);

  const parsed = Model.parse<{ theStuff: { users: [number, User, string] } }>(JSON.parse(objJSON));

  expect(parsed.theStuff.users[0]).toBe(42);
  expect(parsed.theStuff.users[2]).toBe('hello');

  const userFromJS = parsed.theStuff.users[1];
  expect(userFromJS).toBeInstanceOf(User);
  expect(userFromJS).not.toBe(user);
  expect(userFromJS).toEqual(user);
  expect(userFromJS.locations).not.toBe(user.locations);
  expect(userFromJS.locations).toEqual(user.locations);
  expect(userFromJS.seq).toEqual(user.seq);
  expect(userFromJS.persisted).toBeUndefined();
});
