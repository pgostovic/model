import { createLogger } from '@phnq/log';

import { DataStore, SearchResult } from '../DataStore';
import { ModelData, ModelId } from '../Model';
import Query from '../Query';

const log = createLogger('memoryDataStore');

export type MemoryDataStoreQuery = Query & ModelData;

const collections = new Map<string, ModelData[]>();

const getCollection = (name: string): ModelData[] => collections.get(name) || [];

const dataId = (function* messageIdGen() {
  let i = 0;
  while (true) {
    i += 1;
    yield String(i);
  }
})();

const formatDotQuery = (dotQuery: string, value: unknown): ModelData => {
  const formattedQuery: ModelData = { id: ModelId.Empty };
  let q = formattedQuery;
  const comps = dotQuery.split('.');
  const last = comps.splice(-1)[0];
  comps.forEach(comp => {
    q = q[comp] = { id: ModelId.Empty };
  });
  q[last] = value;
  return formattedQuery;
};

const deepMatch = (query: unknown, data: unknown, matchAll: boolean): boolean => {
  if (query instanceof Array && data instanceof Array) {
    if (matchAll) {
      return !query.find((item, i) => !deepMatch(item, data[i], matchAll));
    } else {
      return !!query.find((item, i) => deepMatch(item, data[i], matchAll));
    }
  } else if (typeof query === 'object' && typeof data === 'object') {
    if (matchAll) {
      return !Object.keys(query as Record<string, unknown>).find(
        k => !deepMatch((query as any)[k], (data as any)[k], matchAll),
      );
    } else {
      return !!Object.keys(query as Record<string, unknown>).find(k =>
        deepMatch((query as any)[k], (data as any)[k], matchAll),
      );
    }
  }
  return query === data;
};

const match = (query: MemoryDataStoreQuery, record: ModelData): boolean => {
  let isMatch = true;
  Object.keys(query).forEach(k => {
    if (k.match(/\./)) {
      isMatch = isMatch && deepMatch(formatDotQuery(k, (query as any)[k]), record, false);
    } else {
      isMatch = isMatch && deepMatch({ [k]: query[k] }, record, true);
    }
  });
  return isMatch;
};

export const logCollections = (): void => {
  collections.forEach((value, key) => {
    console.log('COLLECTION: ', key);
    console.log(JSON.stringify(value, null, 2));
  });
};

class MemoryDataStore implements DataStore {
  async save(modelName: string, data: ModelData): Promise<ModelId> {
    const id = (data.id as ModelId).toString() || dataId.next().value;
    const records = getCollection(modelName).filter(record => (record.id as ModelId).toString() !== id);
    const newRecord = { ...data, id: new ModelId(id) };
    collections.set(modelName, [...records, newRecord]);
    log(`SAVE - ${modelName}(${id})`);
    return new ModelId(id);
  }

  create(modelName: string, data: ModelData): Promise<ModelId> {
    return this.save(modelName, data);
  }

  update(modelName: string, data: ModelData): Promise<ModelId> {
    return this.save(modelName, data);
  }

  async delete(modelName: string, arg: ModelId | Query): Promise<boolean> {
    if (arg instanceof ModelId) {
      const id = arg as ModelId;
      const records = getCollection(modelName).filter(data => !id.equals(data.id as ModelId));
      collections.set(modelName, records);
    } else {
      const query = arg as Query;
      const records = getCollection(modelName).filter(record => !match(query, record));
      collections.set(modelName, records);
    }
    return true;
  }

  async find(modelName: string, id: ModelId): Promise<ModelData | undefined> {
    const record = getCollection(modelName).find(r => (r.id as ModelId).equals(id));
    log(`FIND - ${modelName}(${id}) ${record ? 'found' : 'not found'}`);
    return record;
  }

  search(modelName: string, query: any): SearchResult {
    const records = getCollection(modelName).filter(record => match(query, record));
    return {
      count: new Promise<number>(resolve => {
        resolve(records.length);
      }),
      iterator: (async function* () {
        log(`SEARCH - ${modelName}(${JSON.stringify(query)}) ${records.length} records`);
        for (const record of records) {
          yield record;
        }
      })(),
    };
  }

  async drop(modelName: string): Promise<boolean> {
    collections.set(modelName, []);
    return true;
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async close(): Promise<void> {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async createIndex(): Promise<void> {}
}

export const memoryDataStore = new MemoryDataStore();
