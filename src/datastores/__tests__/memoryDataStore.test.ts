import { setDefaultDataStore } from '../../datastore';
import { memoryDataStore } from '../../index.server';
import { field, find, IData, Model, search } from '../../model';

interface ICarData extends IData {
  email?: string;
  firstName?: string;
  lastName?: string;
  stuff?: {
    foo: number;
    bar: number;
  };
}

setDefaultDataStore(memoryDataStore);

class Car extends Model<ICarData, Car> {
  @field public make?: string;
  @field public model?: string;
  @field public colour?: string;
  @field public stuff?: {
    foo: number;
  };
}

beforeEach(async () => {
  await Car.drop();
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

test('Search by sub-attribute', async () => {
  const car = new Car({ make: 'Volvo', model: 'XC-90', colour: 'Willow', stuff: { foo: 42, bar: 43 } });
  await car.save();

  const results = await search(Car, { stuff: { foo: 42, bar: 43 } });
  expect(results.length).toBe(1);
});

test('Search by sub-attribute, dot notation', async () => {
  const car = new Car({ make: 'Volvo', model: 'XC-90', colour: 'Willow', stuff: { foo: 42, bar: 43 } });
  await car.save();

  const results = await search(Car, { 'stuff.foo': 42 });
  expect(results.length).toBe(1);
});

afterAll(async () => {
  await memoryDataStore.close();
});