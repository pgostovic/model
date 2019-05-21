import { find, IModel, Model, search, setDefaultDataStore } from '../../index';
import { memoryDataStore } from '../memoryDataStore';

interface ICarData extends IModel {
  make?: string;
  model?: string;
  colour?: string;
  stuff?: {
    foo: number;
    bar: number;
  };
}

setDefaultDataStore(memoryDataStore);

class Car extends Model<ICarData> {
  public make?: string;
  public model?: string;
  public colour?: string;
  public stuff?: {
    foo: number;
    bar: number;
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

test('Retrieve by id, update', async () => {
  const car = new Car({ make: 'Volvo', model: 'XC-90', colour: 'Willow' });
  const savedCar = await car.save();
  const foundCar = await find(Car, savedCar.id);
  if (foundCar) {
    expect(foundCar.id).toBe(savedCar.id);

    foundCar.colour = 'Yellow';
    await foundCar.save();

    const foundUpdatedCar = await find(Car, savedCar.id);
    if (foundUpdatedCar) {
      expect(foundUpdatedCar.colour).toBe('Yellow');
    }
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
  const car = new Car({
    make: 'Volvo',
    model: 'XC-90',
    colour: 'Willow',
    stuff: { foo: 42, bar: 43 },
  });
  await car.save();

  const results = await search(Car, { stuff: { foo: 42, bar: 43 } });
  expect(results.length).toBe(1);
});

test('Search by sub-attribute, dot notation', async () => {
  const car = new Car({
    make: 'Volvo',
    model: 'XC-90',
    colour: 'Willow',
    stuff: { foo: 42, bar: 43 },
  });
  await car.save();

  const results = await search(Car, { 'stuff.foo': 42 });
  expect(results.length).toBe(1);
});

afterAll(async () => {
  await memoryDataStore.close();
});
