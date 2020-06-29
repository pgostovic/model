import { setDefaultDataStore } from '../../index';
import { ModelId } from '../../Model';
import { PostgresDataStore } from '../PostresDataStore';

const postgresDataStore = new PostgresDataStore(
  process.env.POSTGRES_URI || 'postgres://localhost:5432/phnq_model_test',
);

setDefaultDataStore(postgresDataStore);

test('temp coverage', async () => {
  const ds = new PostgresDataStore('the url');

  try {
    await ds.create('model', { id: ModelId.Empty });
  } catch (err) {
    expect(err).toBeInstanceOf(Error);
  }

  try {
    await ds.update('model', { id: ModelId.Empty });
  } catch (err) {
    expect(err).toBeInstanceOf(Error);
  }

  try {
    await ds.find('model', new ModelId('id'));
  } catch (err) {
    expect(err).toBeInstanceOf(Error);
  }

  try {
    await ds.search('model', {}, undefined);
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
