import { DataStore, SearchResult } from '../DataStore';
import { ModelData, ModelId } from '../Model';
import Query from '../Query';

export const noOpDataStore: DataStore = {
  async create(modelName: string, data: ModelData): Promise<ModelId> {
    throw new Error(`Operation not permitted in this context: save / ${modelName} / ${data}`);
  },

  async update(modelName: string, data: ModelData): Promise<ModelId> {
    throw new Error(`Operation not permitted in this context: save / ${modelName} / ${data}`);
  },

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async delete(_modelName: string, _arg: ModelId | Query): Promise<boolean> {
    return false;
  },

  async find(modelName: string, id: ModelId): Promise<ModelData | undefined> {
    throw new Error(`Operation not permitted in this context: find / ${modelName} / ${id}`);
  },

  search(modelName: string, query: Query): SearchResult {
    throw new Error(`Operation not permitted in this context: search / ${modelName} / ${query}`);
  },

  async drop(modelName: string): Promise<boolean> {
    throw new Error(`Operation not permitted in this context: drop / ${modelName}`);
  },

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async close() {},

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async createIndex(): Promise<void> {},
};
