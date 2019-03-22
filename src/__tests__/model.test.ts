/* tslint:disable max-classes-per-file */

import { field, Model, mutable } from '../index.server';

interface IUserData {
  email?: string;
  firstName?: string;
  lastName?: string;
}

class User extends Model<IUserData> {
  @field public email?: string;
  @field public firstName?: string;
  @field public lastName?: string;
}

@mutable
class MutableUser extends Model<IUserData> {
  @field public email?: string;
  @field public firstName?: string;
  @field public lastName?: string;
}

interface IWithDefaultData {
  num?: number;
  isStuff?: boolean;
}

class WithDefault extends Model<IWithDefaultData> {
  @field public num?: number;
  @field public isStuff?: boolean;

  constructor(data: IWithDefaultData) {
    super({ isStuff: false, ...data });
  }
}

interface IWithDateData {
  date?: Date;
}

class WithDate extends Model<IWithDateData> {
  @field public date?: Date;
}

test('new model instance', () => {
  const user = new User({
    email: 'user@test.com',
    firstName: 'Bubba',
    lastName: 'Gump',
  });

  expect(user.email).toBe('user@test.com');
  expect(user.firstName).toBe('Bubba');
  expect(user.lastName).toBe('Gump');
});

test('new model instance with unsupported keys', () => {
  expect(() => {
    const user = new User({
      bread: 'rye',
      cheese: 'cheddar',
      email: 'user@test.com',
      firstName: 'Bubba',
      lastName: 'Gump',
    });
    expect(user).toBeNull();
  }).toThrow();
});

test('may not mutate model instance', () => {
  const user = new User({
    email: 'user@test.com',
    firstName: 'Bubba',
    lastName: 'Gump',
  });

  expect(() => {
    user.email = 'bubba@gump.com';
  }).toThrow();
});

test('may mutate instance of model marked mutable', () => {
  const user = new MutableUser({
    email: 'user@test.com',
    firstName: 'Bubba',
    lastName: 'Gump',
  });

  expect(() => {
    user.id = 'abcd1234';
    expect(user.id).toBe('abcd1234');
    user.email = 'bubba@gump.com';
    expect(user.email).toBe('bubba@gump.com');
  }).not.toThrow();
});

test('copy model instance', () => {
  const user = new User({
    email: 'user@test.com',
    firstName: 'Bubba',
    lastName: 'Gump',
  });

  const userCopy = new User({ ...user });

  expect(userCopy.email).toBe('user@test.com');
  expect(userCopy.firstName).toBe('Bubba');
  expect(userCopy.lastName).toBe('Gump');
});

test('copy model instance, change field', () => {
  const user = new User({
    email: 'user@test.com',
    firstName: 'Bubba',
    lastName: 'Gump',
  });

  const userCopy = new User({ ...user, email: 'user2@test.com' });

  expect(userCopy.email).toBe('user2@test.com');
  expect(userCopy.firstName).toBe('Bubba');
  expect(userCopy.lastName).toBe('Gump');
});

test('default field value', () => {
  const w = new WithDefault({
    num: 42,
  });

  expect(w.num).toBe(42);
  expect(w.isStuff).toBe(false);
});

test('default field value overridden', () => {
  const w = new WithDefault({
    num: 42,
    isStuff: true,
  });

  expect(w.num).toBe(42);
  expect(w.isStuff).toBe(true);
});

test('with date field', () => {
  const date = new Date();

  const w = new WithDate({
    date,
  });

  expect(w.date).toBe(date);
});
