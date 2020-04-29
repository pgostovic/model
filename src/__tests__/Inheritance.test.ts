import { setDefaultDataStore } from '../Datastore';
import { memoryDataStore } from '../datastores/MemoryDataStore';
import { field, find, Model, search } from '../Model';

setDefaultDataStore(memoryDataStore);

class Animal extends Model {
  @field public isAlive = true;
  @field public name: string;

  constructor(name: string) {
    super();
    this.name = name;
  }
}

class Dog extends Animal {
  @field public isWild: boolean;

  constructor(name: string, isWild: boolean) {
    super(name);
    this.name = name;
    this.isWild = isWild;
  }
}

class Pug extends Dog {
  @field public sheds = false;
}

class Cat extends Animal {
  @field public isDeclawed: boolean;

  constructor(name: string, isDeclawed: boolean) {
    super(name);
    this.name = name;
    this.isDeclawed = isDeclawed;
  }
}

beforeAll(async () => {
  await new Dog('Fido', false).save(); // id: '1'
  await new Dog('Butch', true).save(); // id: '2'
  await new Pug('Spike', false).save(); // id: '3'
  await new Cat('Morris', true).save(); // id: '4'
});

test('Find by class', async () => {
  expect(await find(Animal, '1')).toBeDefined();
  expect(await find(Dog, '1')).toBeDefined();
  expect(await find(Pug, '1')).not.toBeDefined();
  expect(await find(Cat, '1')).not.toBeDefined();

  expect(await find(Animal, '3')).toBeDefined();
  expect(await find(Dog, '3')).toBeDefined();
  expect(await find(Pug, '3')).toBeDefined();
  expect(await find(Cat, '3')).not.toBeDefined();

  expect(await find(Animal, '4')).toBeDefined();
  expect(await find(Dog, '4')).not.toBeDefined();
  expect(await find(Pug, '4')).not.toBeDefined();
  expect(await find(Cat, '4')).toBeDefined();
});

test('Search by class', async () => {
  expect((await search(Animal, { isAlive: true }).all()).length).toBe(4);
  expect((await search(Dog, { isAlive: true }).all()).length).toBe(3);
  expect((await search(Pug, { isAlive: true }).all()).length).toBe(1);
  expect((await search(Cat, { isAlive: true }).all()).length).toBe(1);
});
