import { HasId, Model } from './Model';
import cloneDeep = require('lodash.clonedeep');
import { SearchResult } from './Datastore';

class Cursor<T extends Model> {
  private modelIterator: () => AsyncIterableIterator<T & HasId>;
  private cache: (T & HasId)[] = [];
  public readonly count: Promise<number>;

  public constructor(c: new (...args: unknown[]) => T, searchResult: SearchResult) {
    const cache = this.cache;
    this.count = searchResult.count;
    this.modelIterator = async function*() {
      for (const cached of cache) {
        yield cached;
      }

      for await (const data of searchResult.iterator) {
        const model = new Model();
        model.persistedData = cloneDeep(data);
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
