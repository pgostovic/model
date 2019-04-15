import { setDefaultDataStore } from '../../datastore';
import { field, find, IData, Model, search } from '../../model';
import MongoDataStore from '../mongoDataStore';

interface ICarData extends IData {
  email?: string;
  firstName?: string;
  lastName?: string;
  stuff?: {
    foo: number;
  };
}

const mongoDataStore = new MongoDataStore(process.env.MONGODB_URI || 'mongodb://localhost:27017/modeltest');

setDefaultDataStore(mongoDataStore);

class Car extends Model<ICarData, Car> {
  @field public make?: string;
  @field public model?: string;
  @field public colour?: string;
}

beforeEach(async () => {
  await Car.drop()
});

test('Saved model gets id', async () => {
  const car = new Car({ make: 'Volvo', model: 'XC-90', colour: 'Willow' });
  expect(car.id).toBeUndefined();
  const savedCar = await car.save();
  expect(savedCar.id).not.toBeUndefined();
});

test('Retrieve by id', async () => {
  const car = new Car({ make: 'Volvo', model: 'XC-90', colour: 'Willow' });
  const savedCar = await car.save();
  const foundCar = await find(Car, savedCar.id);
  if (foundCar) {
    expect(foundCar.id).toBe(savedCar.id);
  }
});

test('Search by attribute', async () => {
  const car1 = new Car({ make: 'Volvo', model: 'XC-90', colour: 'Willow' });
  const car2 = new Car({ make: 'Volvo', model: 'XC-70', colour: 'Black' });
  const car3 = new Car({ make: 'Honda', model: 'Accord', colour: 'Black' });
  await car1.save();
  await car2.save();
  await car3.save();

  const volvos = await search(Car, { make: 'Volvo' });
  expect(volvos.length).toBe(2);

  const blackCars = await search(Car, { colour: 'Black' });
  expect(blackCars.length).toBe(2);
});


afterAll(async () => {
  await mongoDataStore.close();
});