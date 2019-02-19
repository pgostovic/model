import { IData } from './model';

export type IQuery = any;

export interface IDataStore {
  save: (modelName: string, data: IData) => Promise<string>;
  find: (modelName: string, id: string) => Promise<IData | undefined>;
  search: (modelName: string, query: IQuery) => Promise<IData[]>;
}

const dataStoresByModel = new Map<any, IDataStore>();

export const datastore = (ds: IDataStore) => (modelClass: any) => {
  dataStoresByModel.set(modelClass, ds);
};

const getDataStore = (modelClass: any): IDataStore => {
  const ds = dataStoresByModel.get(modelClass);
  if (!ds) {
    throw new Error(`No datastore set for ${modelClass.name}`);
  }
  return ds;
};

export const saveData = (modelClass: any, data: IData) =>
  getDataStore(modelClass).save(modelClass.name, data);

export const findData = (modelClass: any, id: string) =>
  getDataStore(modelClass).find(modelClass.name, id);

export const searchData = (modelClass: any, query: IQuery) =>
  getDataStore(modelClass).search(modelClass.name, query);
