import { createLogger } from '@phnq/log';

import { DataStore, Query, SearchResult } from '../Datastore';
import { Data, ModelId, Value } from '../Model';

const log = createLogger('memoryDataStore');

export type MemoryDataStoreQuery = Query & Data;

const collections = new Map<string, Data[]>();

const getCollection = (name: string): Data[] => collections.get(name) || [];

const dataId = (function* messageIdGen() {
  let i = 0;
  while (true) {
    i += 1;
    yield String(i);
  }
})();

const formatDotQuery = (dotQuery: string, value: Value): Data => {
  const formattedQuery: Data = {};
  let q = formattedQuery;
  const comps = dotQuery.split('.');
  const last = comps.splice(-1)[0];
  comps.forEach(comp => {
    q = q[comp] = {};
  });
  q[last] = value;
  return formattedQuery;
};

const deepMatch = (query: Value, data: Value, matchAll: boolean): boolean => {
  if (query instanceof Array && data instanceof Array) {
    if (matchAll) {
      return !query.find((item, i) => !deepMatch(item, data[i], matchAll));
    } else {
      return !!query.find((item, i) => deepMatch(item, data[i], matchAll));
    }
  } else if (typeof query === 'object' && typeof data === 'object') {
    if (matchAll) {
      return !Object.keys(query).find(k => !deepMatch((query as any)[k], (data as any)[k], matchAll));
    } else {
      return !!Object.keys(query).find(k => deepMatch((query as any)[k], (data as any)[k], matchAll));
    }
  }
  return query === data;
};

const match = (query: MemoryDataStoreQuery, record: Data): boolean => {
  let isMatch = true;
  Object.keys(query).forEach(k => {
    if (k.match(/\./)) {
      isMatch = isMatch && deepMatch(formatDotQuery(k, (query as { [key: string]: Value })[k]), record, false);
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
  async save(modelName: string, data: Data): Promise<ModelId> {
    const id = (data.id as string) || dataId.next().value;
    const records = getCollection(modelName).filter(record => record.id !== id);
    const newRecord = { ...data, id };
    collections.set(modelName, [...records, newRecord]);
    log(`SAVE - ${modelName}(${id})`);
    return id;
  }

  create(modelName: string, data: Data): Promise<ModelId> {
    return this.save(modelName, data);
  }

  update(modelName: string, data: Data): Promise<ModelId> {
    return this.save(modelName, data);
  }

  async find(modelName: string, id: ModelId): Promise<Data | undefined> {
    const record = getCollection(modelName).find(r => r.id === id);
    log(`FIND - ${modelName}(${id}) ${record ? 'found' : 'not found'}`);
    return record;
  }

  search(modelName: string, query: any): SearchResult {
    const records = getCollection(modelName).filter(record => match(query, record));
    return {
      count: new Promise<number>(resolve => {
        resolve(records.length);
      }),
      iterator: (async function*() {
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
}

export const memoryDataStore = new MemoryDataStore();
