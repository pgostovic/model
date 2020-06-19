import { createLogger } from '@phnq/log';

import { noOpDataStore } from './datastores/noOpDataStore';
import { Model, ModelData, ModelId } from './Model';

const log = createLogger('DataStore');

export type Query = unknown;
// export type Options = unknown;
export interface Options {
  /** Fields to include in results -- include all by default */
  include?: string[];
  /** Fields to exclude in results -- exclude none by default */
  exclude?: string[];
  /** Sort criteria -- list of fields (minus prefix for descending) */
  sort?: string[];
  /** Max number of results to return */
  limit?: number;
  /** Pagination offset */
  offset?: number;
}

export interface SearchResult {
  count: Promise<number>;
  iterator: AsyncIterableIterator<ModelData>;
}

export interface DataStore {
  create(modelName: string, data: ModelData): Promise<ModelId>;
  update(modelName: string, data: ModelData): Promise<ModelId>;
  find(modelName: string, id: ModelId): Promise<ModelData | undefined>;
  search(modelName: string, query: Query, options?: Options): SearchResult;
  drop(modelName: string): Promise<boolean>;
  close(): Promise<void>;
}

const dataStoresByModel = new Map<typeof Model, DataStore>();

// Decorator to mark a model's datastore
export const datastore = (ds: DataStore) => (modelClass: any) => {
  if (modelClass === modelClass.baseClass) {
    dataStoresByModel.set(modelClass, ds);
  } else {
    throw new Error('Datastores may only be configured for immediate descendents of Model.');
  }
  return modelClass;
};

let defaultDataStore: DataStore = noOpDataStore;

export const setDefaultDataStore = (ds: DataStore): void => {
  if (defaultDataStore && defaultDataStore !== ds) {
    log.warn('Seems weird to call setDefaultDataStore() more than once. Are you sure you wanted that?');
  }
  defaultDataStore = ds;
};

const getDataStore = (modelClass: typeof Model): DataStore => {
  const ds = dataStoresByModel.get(modelClass.baseClass) || defaultDataStore;
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

export const searchData = (modelClass: typeof Model, query: Query, options?: Options): SearchResult =>
  getDataStore(modelClass).search(modelClass.collectionName, query, options);

export const dropData = async (modelClass: typeof Model): Promise<boolean> => {
  const collectionName = modelClass.collectionName;
  const dropped = await getDataStore(modelClass).drop(collectionName);
  observers.forEach(observer => observer.observe(PersistOperation.Drop, collectionName, {}));
  return dropped;
};
