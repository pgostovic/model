import { field, Model, ModelId } from '../Model';

class User extends Model {
  @field public email: string;
  @field public firstName?: string;
  @field public lastName?: string;
  @field public birthdate?: Date;
  @field public numPets?: number;
  @field public married?: boolean;
  @field public stuff = { num: 42 };

  constructor({ email }: { email: string }) {
    super();
    this.email = email;
  }
}

class WithDefaults extends Model {
  @field public num = 42;
  @field public isStuff = true;
}

class WithDate extends Model {
  @field public date?: Date;
}

test('new model instance', () => {
  const user = new User({
    email: 'user@test.com',
  });
  user.firstName = 'Bubba';
  user.lastName = 'Gump';

  expect(user.email).toBe('user@test.com');
  expect(user.firstName).toBe('Bubba');
  expect(user.lastName).toBe('Gump');
});

test('may not mutate a frozen model instance', () => {
  const user = new User({
    email: 'user@test.com',
  }).freeze();

  expect(() => {
    user.email = 'bubba@gump.com';
  }).toThrow();
});

test('may mutate instance of model', () => {
  const user = new User({
    email: 'user@test.com',
  });

  expect(() => {
    user.email = 'bubba@gump.com';
    expect(user.email).toBe('bubba@gump.com');
  }).not.toThrow();
});

test('clone model instance', () => {
  const user = new User({
    email: 'user@test.com',
  });
  user.firstName = 'Bubba';
  user.lastName = 'Gump';

  const userClone = user.clone();

  expect(userClone.email).toBe('user@test.com');
  expect(userClone.firstName).toBe('Bubba');
  expect(userClone.lastName).toBe('Gump');
});

test('clone model instance, change field', () => {
  const user = new User({
    email: 'user@test.com',
  });
  user.firstName = 'Bubba';
  user.lastName = 'Gump';

  const userClone = user.clone();
  userClone.email = 'user2@test.com';
  userClone.stuff.num = 43;

  expect(user.email).toBe('user@test.com');
  expect(user.stuff.num).toBe(42);
  expect(userClone.stuff.num).toBe(43);
  expect(userClone.email).toBe('user2@test.com');
  expect(userClone.firstName).toBe('Bubba');
  expect(userClone.lastName).toBe('Gump');
});

test('default field value', () => {
  const w = new WithDefaults();

  expect(w.num).toBe(42);
  expect(w.isStuff).toBe(true);
});

test('with date field', () => {
  const date = new Date();

  const w = new WithDate();
  w.date = date;

  expect(w.date).toBe(date);
});

test('fromJS with non-existent class id', () => {
  // expect(() => {
  Model.parse({ id: ModelId.Empty, nothing: 'much', _classes_: ['Cheese'] });
  // }).toThrow();
});
