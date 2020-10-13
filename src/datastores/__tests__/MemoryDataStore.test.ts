import AuditLogger from '../../AuditLogger';
import { addPersistObserver } from '../../DataStore';
import { field, find, Model, search, setDefaultDataStore } from '../../index';
import { ModelId } from '../../Model';
import { memoryDataStore } from '../MemoryDataStore';

setDefaultDataStore(memoryDataStore);

const auditLogger = new AuditLogger();
addPersistObserver(auditLogger);

class Car extends Model {
  @field public make: string;
  @field public model: string;
  @field public colour: string;
  @field public stuff?: {
    foo: number;
    bar: number;
  };

  constructor({ make, model, colour }: { make: string; model: string; colour: string }) {
    super();
    this.make = make;
    this.model = model;
    this.colour = colour;
  }
}

afterAll(async () => {
  // logCollections();

  // console.log('RECONSTRUCT', await auditLogger.reconstruct());

  await auditLogger.reconstruct();
});

beforeEach(async () => {
  await Car.drop();
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

  const volvos = await search(Car, { make: 'Volvo' }).all();
  expect(volvos.length).toBe(2);

  const blackCars = await search(Car, { colour: 'Black' }).all();
  expect(blackCars.length).toBe(2);

  const noCars = await search(Car, { colour: 'Black', bubba: [1, 2, 3] }).all();
  expect(noCars.length).toBe(0);

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
  expect(results[0].stuff).toEqual(car.stuff);
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

test('delete by id', async () => {
  const savedCar = await new Car({ make: 'Volvo', model: 'XC-90', colour: 'Willow' }).save();
  const id = savedCar.id;
  expect(await find(Car, id)).toBeInstanceOf(Car);
  expect(await savedCar.delete()).toBe(true);
  expect(await find(Car, id)).toBeUndefined();
});

test('delete by query', async () => {
  const car1 = await new Car({ make: 'Volvo', model: 'XC-90', colour: 'Willow' }).save();
  const car2 = await new Car({ make: 'Volvo', model: 'XC-90', colour: 'Yellow' }).save();
  const car3 = await new Car({ make: 'Volvo', model: 'XC-70', colour: 'White' }).save();

  const car1Id = car1.id;
  const car2Id = car2.id;
  const car3Id = car3.id;

  expect(await Car.delete({ model: 'XC-90' })).toBe(true);
  expect(await find(Car, car1Id)).toBeUndefined();
  expect(await find(Car, car2Id)).toBeUndefined();
  expect(await find(Car, car3Id)).toBeInstanceOf(Car);
});

afterAll(async () => {
  await memoryDataStore.close();
});
