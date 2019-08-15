/* tslint:disable max-classes-per-file */

import { classId, field, fromJS, Model } from '../index';
import { Data, ModelParams } from '../model';

class User extends Model {
  @field public email: string;
  @field public firstName?: string;
  @field public lastName?: string;
  @field public birthdate?: Date;
  @field public numPets?: number;
  @field public married?: boolean;

  constructor(data: ModelParams<User>) {
    super(data);
    this.email = data.email as string;
  }
}

@classId('MyClassId')
class WithExplicitClassId extends Model {
  @field public stuff?: string;
}

class WithDefault extends Model {
  @field public num?: number;
  @field public isStuff?: boolean;

  constructor(data: Data) {
    super({ isStuff: false, ...data });
  }
}

class WithDate extends Model<WithDate> {
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

test('may not mutate a frozen model instance', () => {
  const user = new User({
    email: 'user@test.com',
    firstName: 'Bubba',
    lastName: 'Gump',
  }).freeze();

  expect(() => {
    user.email = 'bubba@gump.com';
  }).toThrow();
});

test('may mutate instance of model', () => {
  const user = new User({
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
    id: 'abcd1234',
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

test('fromJS with non-existent class id', () => {
  expect(() => {
    fromJS({ nothing: 'much' });
  }).toThrow();
});

test('Explicit class Id', () => {
  const obj = new WithExplicitClassId({ stuff: 'yo' });

  expect(obj.toJS()._cid_).toBe('MyClassId');
});
