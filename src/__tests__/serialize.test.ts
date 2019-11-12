import { setDefaultDataStore } from '../Datastore';
import { memoryDataStore } from '../datastores/MemoryDataStore';
import { field, fromJS, Model } from '../index';

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
  const userFromJS = fromJS<User>(userJS);

  expect(userFromJS).toBeInstanceOf(User);
  expect(userFromJS).not.toBe(user);
  expect(userFromJS).toEqual(user);
  expect(userFromJS.locations).not.toBe(user.locations);
  expect(userFromJS.locations).toEqual(user.locations);
  expect(userFromJS.seq).toEqual(user.seq);
  expect(userFromJS.persistedData).toBeUndefined();
});

test('serialize/deserialize persisted', async () => {
  const user = new User({
    email: 'bubba@gump.com',
    firstName: 'Bubba',
    lastName: 'Gump',
  });

  await user.save();

  const userJS = user.toJS();
  const userFromJS = fromJS<User>(userJS);

  expect(userFromJS).toBeInstanceOf(User);
  expect(userFromJS).not.toBe(user);
  expect(userFromJS).toEqual(user);
  expect(userFromJS.persistedData).not.toBeUndefined();
});
