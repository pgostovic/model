import { createLogger } from '@phnq/log';
import { IQuery } from '../datastore';
import { IData, IValue } from '../model';

const log = createLogger('memoryDataStore');

export interface IMemoryDataStoreQuery extends IQuery {
  [key: string]: IValue;
}

const collections = new Map<string, IData[]>();

const getCollection = (name: string): IData[] => collections.get(name) || [];

const dataId = (function* messageIdGen() {
  let i = 0;
  while (true) {
    i += 1;
    yield String(i);
  }
})();

export const memoryDataStore = {
  save: async (modelName: string, data: IData): Promise<string> => {
    const id = (data.id as string) || dataId.next().value;
    const records = getCollection(modelName).filter(record => record.id !== id);
    const newRecord = { ...data, id };
    collections.set(modelName, [...records, newRecord]);
    log(`SAVE - ${modelName}(${id})`);
    return id;
  },

  find: async (modelName: string, id: string): Promise<IData | undefined> => {
    const record = getCollection(modelName).find(r => r.id === id);
    log(`FIND - ${modelName}(${id}) ${record ? 'found' : 'not found'}`);
    return record;
  },

  search: async (
    modelName: string,
    query: IMemoryDataStoreQuery,
  ): Promise<IData[]> => {
    const records = getCollection(modelName).filter(
      record => !Object.keys(query).find(k => record[k] !== query[k]),
    );
    log(
      `SEARCH - ${modelName}(${JSON.stringify(query)}) ${
        records.length
      } records`,
    );
    return records;
  },
};

export const logCollections = () => {
  log('COLLECTIONS: ', collections);
};
