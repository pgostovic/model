import { Data, HasId, Model } from './Model';

class Cursor<T> {
  private modelIterator: AsyncIterableIterator<T>;

  public constructor(c: new (...args: any[]) => T, recordIterator: AsyncIterableIterator<Data>) {
    this.modelIterator = (async function*() {
      for await (const data of recordIterator) {
        const model = new Model();
        model.isPersisted = true;
        Object.assign(model, data);
        Object.setPrototypeOf(model, c.prototype);
        yield (model as unknown) as T & HasId;
      }
    })();
  }

  public get iterator(): AsyncIterableIterator<T> {
    return this.modelIterator;
  }

  public async all(): Promise<T[]> {
    const records: T[] = [];
    for await (const record of this.iterator) {
      records.push(record);
    }
    return records;
  }
}

export default Cursor;
