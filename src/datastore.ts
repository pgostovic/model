import { noOpDataStore } from './datastores/noOpDataStore';
import { Data, Model, ModelId } from './Model';

export type Query = any;
export type Options = any;

export interface DataStore {
  create(modelName: string, data: Data): Promise<ModelId>;
  update(modelName: string, data: Data): Promise<ModelId>;
  find(modelName: string, id: ModelId): Promise<Data | undefined>;
  search(modelName: string, query: Query, options: Options): AsyncIterableIterator<Data>;
  drop(modelName: string): Promise<boolean>;
  close(): Promise<void>;
}

const dataStoresByModel = new Map<typeof Model, DataStore>();

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

export enum PersistOperation {
  Create = 'create',
  Update = 'update',
  Delete = 'delete',
  Drop = 'drop',
}

export interface PersistObserver {
  observe(op: PersistOperation, collectionName: string, data: Data): void;
}

const observers: PersistObserver[] = [];

export const addPersistObserver = (observer: PersistObserver): void => {
  observers.push(observer);
};

export const createData = async (modelClass: any, data: Data): Promise<ModelId> => {
  const collectionName = modelClass.collectionName || modelClass.name;
  const id = await getDataStore(modelClass).create(collectionName, data);
  observers.forEach(observer => observer.observe(PersistOperation.Create, collectionName, { ...data, id }));
  return id;
};

export const updateData = async (modelClass: any, data: Data): Promise<ModelId> => {
  const collectionName = modelClass.collectionName || modelClass.name;
  const id = await getDataStore(modelClass).update(collectionName, data);
  observers.forEach(observer => observer.observe(PersistOperation.Update, collectionName, { ...data, id }));
  return id;
};

export const findData = (modelClass: any, id: ModelId): Promise<Data | undefined> =>
  getDataStore(modelClass).find(modelClass.collectionName || modelClass.name, id);

export const searchData = (modelClass: any, query: Query, options: Options): AsyncIterableIterator<Data> =>
  getDataStore(modelClass).search(modelClass.collectionName || modelClass.name, query, options);

export const dropData = async (modelClass: any): Promise<boolean> => {
  const collectionName = modelClass.collectionName || modelClass.name;
  const dropped = await getDataStore(modelClass).drop(collectionName);
  observers.forEach(observer => observer.observe(PersistOperation.Drop, collectionName, {}));
  return dropped;
};
