import { Data, HasId, Model } from './Model';

class Cursor<T extends Model> {
  private modelIterator: () => AsyncIterableIterator<T & HasId>;
  private cache: (T & HasId)[] = [];

  public constructor(c: new (...args: any[]) => T, recordIterator: AsyncIterableIterator<Data>) {
    const cache = this.cache;
    this.modelIterator = async function*() {
      for (const cached of cache) {
        yield cached;
      }

      for await (const data of recordIterator) {
        const model = new Model();
        model.persistedData = data;
        Object.assign(model, data);
        Object.setPrototypeOf(model, c.prototype);
        yield (model as unknown) as T & HasId;
        cache.push((model as unknown) as T & HasId);
      }
    };
  }

  public get iterator(): AsyncIterableIterator<T & HasId> {
    return this.modelIterator();
  }

  public async all(): Promise<(T & HasId)[]> {
    const records: (T & HasId)[] = [];
    for await (const record of this.iterator) {
      records.push(record);
    }
    return records;
  }

  public async first(): Promise<(T & HasId) | undefined> {
    return (await this.all())[0];
  }
}

export default Cursor;
