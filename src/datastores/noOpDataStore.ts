import { DataStore, Query } from '../datastore';
import { Data, ModelId } from '../model';

export const noOpDataStore: DataStore = {
  create: async (modelName: string, data: Data): Promise<ModelId> => {
    throw new Error(`Operation not permitted in this context: save / ${modelName} / ${data}`);
  },

  update: async (modelName: string, data: Data): Promise<ModelId> => {
    throw new Error(`Operation not permitted in this context: save / ${modelName} / ${data}`);
  },

  find: async (modelName: string, id: ModelId): Promise<Data | undefined> => {
    throw new Error(`Operation not permitted in this context: find / ${modelName} / ${id}`);
  },

  search: (modelName: string, query: Query): AsyncIterableIterator<Data> => {
    throw new Error(`Operation not permitted in this context: search / ${modelName} / ${query}`);
  },

  drop: async (modelName: string): Promise<boolean> => {
    throw new Error(`Operation not permitted in this context: drop / ${modelName}`);
  },

  // tslint:disable-next-line: no-empty
  close: async () => {},
};
