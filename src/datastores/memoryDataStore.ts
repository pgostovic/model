import { createLogger } from '@phnq/log';
import { DataStore, IQuery } from '../datastore';
import { Data, Value, ModelId } from '../model';

const log = createLogger('memoryDataStore');

export type IMemoryDataStoreQuery = IQuery & Data;

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

const match = (query: IMemoryDataStoreQuery, record: Data): boolean => {
  let isMatch = true;
  Object.keys(query).forEach(k => {
    if (k.match(/\./)) {
      isMatch = isMatch && deepMatch(formatDotQuery(k, query[k]), record, false);
    } else {
      isMatch = isMatch && deepMatch({ [k]: query[k] }, record, true);
    }
  });
  return isMatch;
};

export const logCollections = (): void => {
  log('COLLECTIONS: ', collections);
};

export const memoryDataStore: DataStore = {
  save: async (modelName: string, data: Data): Promise<ModelId> => {
    const id = (data.id as string) || dataId.next().value;
    const records = getCollection(modelName).filter(record => record.id !== id);
    const newRecord = { ...data, id };
    collections.set(modelName, [...records, newRecord]);
    log(`SAVE - ${modelName}(${id})`);
    return id;
  },

  find: async (modelName: string, id: ModelId): Promise<Data | undefined> => {
    const record = getCollection(modelName).find(r => r.id === id);
    log(`FIND - ${modelName}(${id}) ${record ? 'found' : 'not found'}`);
    return record;
  },

  search: async (modelName: string, query: IMemoryDataStoreQuery): Promise<Data[]> => {
    const records = getCollection(modelName).filter(record => match(query, record));
    log(`SEARCH - ${modelName}(${JSON.stringify(query)}) ${records.length} records`);
    return records;
  },

  drop: async (modelName: string): Promise<boolean> => {
    collections.set(modelName, []);
    return true;
  },

  // tslint:disable-next-line: no-empty
  close: async () => {},
};
