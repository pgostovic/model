import { DataStore, SearchResult } from '../DataStore';
import { ModelData, ModelId } from '../Model';
import Query from '../Query';

export const noOpDataStore: DataStore = {
  create: async (modelName: string, data: ModelData): Promise<ModelId> => {
    throw new Error(`Operation not permitted in this context: save / ${modelName} / ${data}`);
  },

  update: async (modelName: string, data: ModelData): Promise<ModelId> => {
    throw new Error(`Operation not permitted in this context: save / ${modelName} / ${data}`);
  },

  find: async (modelName: string, id: ModelId): Promise<ModelData | undefined> => {
    throw new Error(`Operation not permitted in this context: find / ${modelName} / ${id}`);
  },

  search: (modelName: string, query: Query): SearchResult => {
    throw new Error(`Operation not permitted in this context: search / ${modelName} / ${query}`);
  },

  drop: async (modelName: string): Promise<boolean> => {
    throw new Error(`Operation not permitted in this context: drop / ${modelName}`);
  },

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  close: async () => {},

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async createIndex(): Promise<void> {},
};
