import { field, Model, setDefaultDataStore } from '../../index';
import { PostgresDataStore } from '../postresDataStore';

const postgresDataStore = new PostgresDataStore(
  process.env.POSTGRES_URI || 'postgres://localhost:5432/phnq_model_test',
);

setDefaultDataStore(postgresDataStore);

class Car extends Model {
  @field public make?: string;
  @field public model?: string;
  @field public colour?: string;
  @field public stuff?: {
    foo: number;
    bar: number;
  };
}

if (Date.now() === 0) {
  console.log('TYPES', Car.getFieldTypes());
}

test('test', () => {
  expect(true).toBe(true);
});
