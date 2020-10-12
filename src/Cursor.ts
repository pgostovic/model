import { SearchResult } from './DataStore';
import { Model } from './Model';

class Cursor<T extends Model> {
  private modelIterator: () => AsyncIterableIterator<T>;
  private cache: T[] = [];
  public readonly count: Promise<number>;

  public constructor(searchResult: SearchResult, filter: (m: Model) => boolean = () => true) {
    const cache = this.cache;
    this.count = searchResult.count;
    this.modelIterator = async function*() {
      for (const cached of cache) {
        yield cached;
      }

      for await (const data of searchResult.iterator) {
        const model = Model.parse({ ...data, _isPersisted_: true }) as Model;
        if (filter(model)) {
          yield model as T;
          cache.push(model as T);
        }
      }
    };
  }

  public get iterator(): AsyncIterableIterator<T> {
    return this.modelIterator();
  }

  public async all(): Promise<T[]> {
    const records: T[] = [];
    for await (const record of this.iterator) {
      records.push(record);
    }
    return records;
  }

  public async first(): Promise<T | undefined> {
    return (await this.all())[0];
  }
}

export default Cursor;
