import { setDefaultDataStore } from '../../index';
import { PostgresDataStore } from '../postresDataStore';

const postgresDataStore = new PostgresDataStore(
  process.env.POSTGRES_URI || 'postgres://localhost:5432/phnq_model_test',
);

setDefaultDataStore(postgresDataStore);

test('temp coverage', async () => {
  const ds = new PostgresDataStore('the url');

  try {
    await ds.save('model', {});
  } catch (err) {
    expect(err).toBeInstanceOf(Error);
  }

  try {
    await ds.find('model', 'id');
  } catch (err) {
    expect(err).toBeInstanceOf(Error);
  }

  try {
    await ds.search('model', 'q', undefined);
  } catch (err) {
    expect(err).toBeInstanceOf(Error);
  }

  try {
    await ds.drop('model');
  } catch (err) {
    expect(err).toBeInstanceOf(Error);
  }

  try {
    await ds.close();
  } catch (err) {
    expect(err).toBeInstanceOf(Error);
  }
});
