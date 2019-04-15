import { memoryDataStore } from './index.client';
import { IData } from './model';

export type IQuery = any;

export interface IDataStore {
  save: (modelName: string, data: IData) => Promise<string>;
  find: (modelName: string, id: string) => Promise<IData | undefined>;
  search: (modelName: string, query: IQuery) => Promise<IData[]>;
  drop: (modelName: string) => Promise<boolean>;
  close: () => Promise<void>;
}

const dataStoresByModel = new Map<any, IDataStore>();

// Decorator to mark a model's datastore
export const datastore = (ds: IDataStore, collectionName?: string) => (
  modelClass: any,
) => {
  modelClass.collectionName = collectionName || modelClass.name;
  dataStoresByModel.set(modelClass, ds);
};

let defaultDataStore: IDataStore = memoryDataStore;

export const setDefaultDataStore = (ds: IDataStore) => {
  defaultDataStore = ds;
};

const getDataStore = (modelClass: any): IDataStore => {
  const ds = dataStoresByModel.get(modelClass) || defaultDataStore;
  if (!ds) {
    throw new Error(`No datastore set for ${modelClass.collectionName}`);
  }
  return ds;
};

export const saveData = (modelClass: any, data: IData) =>
  getDataStore(modelClass).save(modelClass.collectionName || modelClass.name, data);

export const findData = (modelClass: any, id: string) =>
  getDataStore(modelClass).find(modelClass.collectionName || modelClass.name, id);

export const searchData = (modelClass: any, query: IQuery) =>
  getDataStore(modelClass).search(modelClass.collectionName || modelClass.name, query);

export const dropData = (modelClass: any) =>
  getDataStore(modelClass).drop(modelClass.collectionName || modelClass.name);
