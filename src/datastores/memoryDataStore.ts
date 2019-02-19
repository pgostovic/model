import { IQuery } from '../datastore';
import { IData, IValue } from '../model';

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

const memoryDataStore = {
  save: async (modelName: string, data: IData): Promise<string> => {
    const id = (data.id as string) || dataId.next().value;
    const records = getCollection(modelName).filter(record => record.id !== id);
    collections.set(modelName, [...records, { ...data, id }]);
    return id;
  },

  find: async (modelName: string, id: string): Promise<IData | undefined> =>
    getCollection(modelName).find(record => record.id === id),

  search: async (
    modelName: string,
    query: IMemoryDataStoreQuery,
  ): Promise<IData[]> =>
    getCollection(modelName).filter(
      record => !Object.keys(query).find(k => record[k] !== query[k]),
    ),
};

export default memoryDataStore;
