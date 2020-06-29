import { datastore } from '../Datastore';
import { memoryDataStore } from '../datastores/MemoryDataStore';
import { field, find, Model, ModelId, search } from '../Model';
// import { qField, qSerialize } from '../Query';

@datastore(memoryDataStore)
abstract class Animal extends Model {
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
  expect(await find(Animal.class, new ModelId('1'))).toBeDefined();
  expect(await find(Dog, new ModelId('1'))).toBeDefined();
  expect(await find(Pug, new ModelId('1'))).not.toBeDefined();
  expect(await find(Cat, new ModelId('1'))).not.toBeDefined();

  expect(await find(Animal.class, new ModelId('3'))).toBeDefined();
  expect(await find(Dog, new ModelId('3'))).toBeDefined();
  expect(await find(Pug, new ModelId('3'))).toBeDefined();
  expect(await find(Cat, new ModelId('3'))).not.toBeDefined();

  expect(await find(Animal.class, new ModelId('4'))).toBeDefined();
  expect(await find(Dog, new ModelId('4'))).not.toBeDefined();
  expect(await find(Pug, new ModelId('4'))).not.toBeDefined();
  expect(await find(Cat, new ModelId('4'))).toBeDefined();
});

test('Search by class', async () => {
  expect((await search(Animal.class, { isAlive: true }).all()).length).toBe(4);
  expect((await search(Dog, { isAlive: true }).all()).length).toBe(3);
  expect((await search(Pug, { isAlive: true }).all()).length).toBe(1);
  expect((await search(Cat, { isAlive: true }).all()).length).toBe(1);
});

// const qqq = qField('userId')
//   .eq('pgostovic')
//   .and(qField('date').gt(new Date(2020, 2, 17)))
//   .and(
//     qField('age')
//       .gt(30)
//       .or(qField('age').lt(20)),
//   );

// console.log('==================== QUERY', JSON.stringify(qSerialize(qqq), null, 2));
