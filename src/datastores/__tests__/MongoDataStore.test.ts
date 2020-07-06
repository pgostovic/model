import { field, find, Model, search, setDefaultDataStore } from '../../index';
import { ModelId } from '../../Model';
import { qField } from '../../Query';
import { MongoDataStore } from '../MongoDataStore';

const mongoDataStore = new MongoDataStore(process.env.MONGODB_URI || 'mongodb://localhost:27017/modeltest');

setDefaultDataStore(mongoDataStore);

class Car extends Model {
  @field public make?: string;
  @field public model?: string;
  @field public colour?: string;
  @field public stuff?: {
    foo: number;
    bar: number;
    otherCarId?: ModelId;
  };

  constructor({ make, model, colour }: { make: string; model: string; colour: string }) {
    super();
    this.make = make;
    this.model = model;
    this.colour = colour;
  }
}

beforeEach(async () => {
  await Car.drop();
});

test('Create index', async () => {
  expect(async () => {
    await mongoDataStore.createIndex('Car', { make: 1 }, {});
  }).not.toThrow();
});

test('Drop non-existent collection', async () => {
  expect(await mongoDataStore.drop('Abcdefghijklmnopqrstuvwxyz')).toBe(false);
});

test('Find by bad format id returns undefined', async () => {
  expect(await find(Car, new ModelId('nope'))).toBeUndefined();
});

test('Find by non-existent id returns undefined', async () => {
  expect(await find(Car, new ModelId('abcdef123456'))).toBeUndefined();
});

test('Saved model gets id', async () => {
  const car = new Car({ make: 'Volvo', model: 'XC-90', colour: 'Willow' });
  expect(car.id).toBe(ModelId.Empty);
  const savedCar = await car.save();
  expect(savedCar.id).not.toBeUndefined();
});

test('Retrieve by id, update', async () => {
  const car = new Car({ make: 'Volvo', model: 'XC-90', colour: 'Willow' });
  const savedCar = await car.save();
  if (!savedCar.id) {
    fail('Id not assigned on save');
    return;
  }

  const foundCar = await find(Car, savedCar.id);
  if (foundCar) {
    expect(foundCar.id).toEqual(savedCar.id);

    foundCar.colour = 'Yellow';

    if (foundCar.persisted) {
      expect(foundCar.persisted.colour).toBe('Willow');
    } else {
      fail('foundCar.persistedData not present');
    }

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

  const volvos = await search(Car, qField('make').eq('Volvo')).all();
  expect(volvos.length).toBe(2);

  const blackCars = await search(Car, { colour: 'Black' }).all();
  expect(blackCars.length).toBe(2);

  const allCars = await search(Car, {}).all();
  expect(allCars.length).toBe(3);
});

test('Search by sub-attribute', async () => {
  const car = new Car({
    make: 'Volvo',
    model: 'XC-90',
    colour: 'Willow',
  });
  car.stuff = { foo: 42, bar: 43 };
  await car.save();

  const results = await search(Car, { stuff: { foo: 42, bar: 43 } }).all();
  expect(results.length).toBe(1);
});

test('Search by sub-attribute, dot notation', async () => {
  const car = new Car({
    make: 'Volvo',
    model: 'XC-90',
    colour: 'Willow',
  });
  car.stuff = { foo: 42, bar: 43 };
  await car.save();

  const results = await search(Car, { 'stuff.foo': 42 }).all();
  expect(results.length).toBe(1);
});

test('Search cursor count', async () => {
  const car1 = new Car({ make: 'Volvo', model: 'XC-90', colour: 'Willow' });
  const car2 = new Car({ make: 'Volvo', model: 'XC-70', colour: 'Black' });
  const car3 = new Car({ make: 'Honda', model: 'Accord', colour: 'Black' });
  await car1.save();
  await car2.save();
  await car3.save();

  const volvosCursor = search(Car, { make: 'Volvo' });
  expect(await volvosCursor.count).toBe(2);

  const blackCarsCursor = search(Car, { colour: 'Black' });
  expect((await blackCarsCursor.all()).length).toBe(2);
  expect(await blackCarsCursor.count).toBe(2);
});

test('Search with query builder', async () => {
  const car1 = new Car({ make: 'Volvo', model: 'XC-90', colour: 'Willow' });
  const car2 = new Car({ make: 'Volvo', model: 'XC-70', colour: 'Black' });
  const car3 = new Car({ make: 'Honda', model: 'Accord', colour: 'Black' });
  const savedCar1 = await car1.save();
  const savedCar2 = await car2.save();
  const savedCar3 = await car3.save();

  const nonVolvos = search(Car, qField('id').nin([savedCar1.id, savedCar2.id]));
  expect(await nonVolvos.count).toBe(1);
  expect((await nonVolvos.all())[0].id).toEqual(savedCar3.id);
});

test('Search sort by sub attribute', async () => {
  const car1 = new Car({ make: 'Volvo', model: 'XC-90', colour: 'Willow' });
  car1.stuff = { foo: 1, bar: 10 };
  const car2 = new Car({ make: 'Volvo', model: 'XC-70', colour: 'Black' });
  car2.stuff = { foo: 2, bar: 5 };
  const car3 = new Car({ make: 'Volvo', model: 'XC-50', colour: 'Red' });
  car3.stuff = { foo: 3, bar: 8 };
  await car1.save();
  await car2.save();
  await car3.save();

  const volvos = search(Car, { make: 'Volvo' }, { sort: ['stuff.bar'] });
  expect((await volvos.all()).map(({ model }) => model)).toEqual(['XC-70', 'XC-50', 'XC-90']);

  const volvosDesc = search(Car, { make: 'Volvo' }, { sort: ['-stuff.foo'] });
  expect((await volvosDesc.all()).map(({ model }) => model)).toEqual(['XC-50', 'XC-70', 'XC-90']);
});

test('Search include/exclude fields', async () => {
  const car1 = new Car({ make: 'Volvo', model: 'XC-90', colour: 'Willow' });
  car1.stuff = { foo: 1, bar: 10 };
  const car2 = new Car({ make: 'Volvo', model: 'XC-70', colour: 'Black' });
  car2.stuff = { foo: 2, bar: 5 };
  const car3 = new Car({ make: 'Volvo', model: 'XC-50', colour: 'Red' });
  car3.stuff = { foo: 3, bar: 8 };
  await car1.save();
  await car2.save();
  await car3.save();

  const volvos1 = await search(Car, { make: 'Volvo' }, { include: ['colour'] }).all();
  expect(volvos1.map(({ make }) => make).filter(Boolean)).toEqual([]);
  expect(volvos1.map(({ model }) => model).filter(Boolean)).toEqual([]);
  expect(volvos1.map(({ stuff }) => stuff).filter(Boolean)).toEqual([]);
  expect(volvos1.map(({ colour }) => colour).filter(Boolean)).toEqual(['Willow', 'Black', 'Red']);

  const volvos2 = await search(Car, { make: 'Volvo' }, { exclude: ['colour'] }).all();
  expect(volvos2.map(({ colour }) => colour).filter(Boolean)).toEqual([]);
  expect(volvos2.map(({ model }) => model).filter(Boolean)).toEqual(['XC-90', 'XC-70', 'XC-50']);
});

test('Find include/exclude fields', async () => {
  const car = new Car({ make: 'Volvo', model: 'XC-90', colour: 'Willow' });
  car.stuff = { foo: 1, bar: 10 };
  const savedCar = await car.save();

  const foundCar1 = await find(Car, savedCar.id, { include: ['colour'] });
  if (foundCar1) {
    expect(foundCar1.colour).toBe('Willow');
    expect(foundCar1.make).toBeUndefined();
    expect(foundCar1.model).toBeUndefined();
    expect(foundCar1.stuff).toBeUndefined();
  } else {
    fail('Not found');
  }

  const foundCar2 = await find(Car, savedCar.id, { exclude: ['colour'] });
  if (foundCar2) {
    expect(foundCar2.colour).toBeUndefined();
    expect(foundCar2.make).toBe('Volvo');
    expect(foundCar2.model).toBe('XC-90');
    expect(foundCar2.stuff).toEqual({ foo: 1, bar: 10 });
  } else {
    fail('Not found');
  }
});

test('non-id ModelId', async () => {
  const car1 = new Car({ make: 'Volvo', model: 'XC-90', colour: 'Willow' });
  const savedCar1 = await car1.save();

  const car2 = new Car({ make: 'Volvo', model: 'XC-70', colour: 'Black' });
  car2.stuff = { foo: 2, bar: 5, otherCarId: savedCar1.id };
  const savedCar2 = await car2.save();

  const foundCar2 = await find(Car, savedCar2.id);
  if (foundCar2 && foundCar2.stuff) {
    expect(foundCar2.stuff.otherCarId).toStrictEqual(savedCar1.id);
  } else {
    fail('No foundCar2.stuff');
  }

  const foundCars = await search(Car, { 'stuff.otherCarId': savedCar1.id }).all();
  if (foundCars.length === 1) {
    expect(foundCars[0].id).toStrictEqual(savedCar2.id);
  } else {
    fail('No cars found');
  }
});

afterAll(async () => {
  await mongoDataStore.close();
});
