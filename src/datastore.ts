import { noOpDataStore } from './datastores/noOpDataStore';
import { Data, ModelId } from './model';

export type Query = any;
export type Options = any;

export interface DataStore {
  save(modelName: string, data: Data): Promise<ModelId>;
  find(modelName: string, id: ModelId): Promise<Data | undefined>;
  search(modelName: string, query: Query, options: Options): Promise<Data[]>;
  drop(modelName: string): Promise<boolean>;
  close(): Promise<void>;
}

const dataStoresByModel = new Map<any, DataStore>();

// Decorator to mark a model's datastore
export const datastore = (ds: DataStore, collectionName?: string) => (modelClass: any) => {
  modelClass.collectionName = collectionName || modelClass.name;
  dataStoresByModel.set(modelClass, ds);
};

let defaultDataStore: DataStore = noOpDataStore;

export const setDefaultDataStore = (ds: DataStore): void => {
  defaultDataStore = ds;
};

const getDataStore = (modelClass: any): DataStore => {
  const ds = dataStoresByModel.get(modelClass) || defaultDataStore;
  if (!ds) {
    throw new Error(`No datastore set for ${modelClass.collectionName}`);
  }
  return ds;
};

export const saveData = (modelClass: any, data: Data): Promise<ModelId> =>
  getDataStore(modelClass).save(modelClass.collectionName || modelClass.name, data);

export const findData = (modelClass: any, id: ModelId): Promise<Data | undefined> =>
  getDataStore(modelClass).find(modelClass.collectionName || modelClass.name, id);

export const searchData = (modelClass: any, query: Query, options: Options): Promise<Data[]> =>
  getDataStore(modelClass).search(modelClass.collectionName || modelClass.name, query, options);

export const dropData = (modelClass: any): Promise<boolean> =>
  getDataStore(modelClass).drop(modelClass.collectionName || modelClass.name);
