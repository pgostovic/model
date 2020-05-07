import { noOpDataStore } from './datastores/noOpDataStore';
import { Model, ModelData, ModelId } from './Model';

export type Query = unknown;
export type Options = unknown;

export interface SearchResult {
  count: Promise<number>;
  iterator: AsyncIterableIterator<ModelData>;
}

export interface DataStore {
  create(modelName: string, data: ModelData): Promise<ModelId>;
  update(modelName: string, data: ModelData): Promise<ModelId>;
  find(modelName: string, id: ModelId): Promise<ModelData | undefined>;
  search(modelName: string, query: Query, options: Options): SearchResult;
  drop(modelName: string): Promise<boolean>;
  close(): Promise<void>;
}

const dataStoresByModel = new Map<typeof Model, DataStore>();

// Decorator to mark a model's datastore
export const datastore = (ds: DataStore) => (modelClass: any) => {
  dataStoresByModel.set(modelClass, ds);
};

let defaultDataStore: DataStore = noOpDataStore;

export const setDefaultDataStore = (ds: DataStore): void => {
  defaultDataStore = ds;
};

const getDataStore = (modelClass: typeof Model): DataStore => {
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
  observe(op: PersistOperation, collectionName: string, data: ModelData): void;
}

const observers: PersistObserver[] = [];

export const addPersistObserver = (observer: PersistObserver): void => {
  observers.push(observer);
};

export const createData = async (modelClass: typeof Model, data: ModelData): Promise<ModelId> => {
  const collectionName = modelClass.collectionName;
  const id = await getDataStore(modelClass).create(collectionName, data);
  observers.forEach(observer => observer.observe(PersistOperation.Create, collectionName, { ...data, id }));
  return id;
};

export const updateData = async (modelClass: typeof Model, data: ModelData): Promise<ModelId> => {
  const collectionName = modelClass.collectionName;
  const id = await getDataStore(modelClass).update(collectionName, data);
  observers.forEach(observer => observer.observe(PersistOperation.Update, collectionName, { ...data, id }));
  return id;
};

export const findData = (modelClass: typeof Model, id: ModelId): Promise<ModelData | undefined> =>
  getDataStore(modelClass).find(modelClass.collectionName, id);

export const searchData = (modelClass: typeof Model, query: Query, options: Options): SearchResult =>
  getDataStore(modelClass).search(modelClass.collectionName, query, options);

export const dropData = async (modelClass: typeof Model): Promise<boolean> => {
  const collectionName = modelClass.collectionName;
  const dropped = await getDataStore(modelClass).drop(collectionName);
  observers.forEach(observer => observer.observe(PersistOperation.Drop, collectionName, {}));
  return dropped;
};
