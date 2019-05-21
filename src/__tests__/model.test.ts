/* tslint:disable max-classes-per-file */

import { classId, fromJS, IModel, Model } from '../index';

interface IUserData extends IModel {
  email: string;
  firstName?: string;
  lastName?: string;
}

class User extends Model<IUserData> {
  public email: string;
  public firstName?: string;
  public lastName?: string;

  constructor(data: IUserData) {
    super(data);
    this.email = data.email;
  }
}

interface IWithExplicitClassIdData extends IModel {
  stuff?: string;
}

@classId('MyClassId')
class WithExplicitClassId extends Model<IWithExplicitClassIdData> {
  public stuff?: string;
}

interface IWithDefaultData extends IModel {
  num?: number;
  isStuff?: boolean;
}

class WithDefault extends Model<IWithDefaultData> {
  public num?: number;
  public isStuff?: boolean;

  constructor(data: IWithDefaultData) {
    super({ isStuff: false, ...data });
  }
}

interface IWithDateData extends IModel {
  date?: Date;
}

class WithDate extends Model<IWithDateData> {
  public date?: Date;
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
