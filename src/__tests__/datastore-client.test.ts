import {
  datastore,
  find,
  IData,
  memoryDataStore,
  Model,
  search,
} from '../index.client';

interface IUserData extends IData {
  email?: string;
  firstName?: string;
  lastName?: string;
}

@datastore(memoryDataStore, 'users')
class User extends Model<IUserData> {
  public email?: string;
  public firstName?: string;
  public lastName?: string;
}

test('save model instance throws on client', async () => {
  const user = new User({
    email: 'user@test.com',
    firstName: 'Bubba',
    lastName: 'Gump',
  });

  try {
    await user.save();
    fail('Should have thrown');
  } catch (err) {
    expect(err).toBeInstanceOf(Error);
  }
});

test('find model instance throws on client', async () => {
  try {
    await find(User, 'some id');
    fail('Should have thrown');
  } catch (err) {
    expect(err).toBeInstanceOf(Error);
  }
});

test('search for model instances throws on client', async () => {
  try {
    await search(User, { lastName: 'Smith' });
    fail('Should have thrown');
  } catch (err) {
    expect(err).toBeInstanceOf(Error);
  }
});
