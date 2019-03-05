import { IQuery } from '../datastore';
import { IData } from '../model';

export const noOpDataStore = {
  save: async (modelName: string, data: IData): Promise<string> => {
    throw new Error(
      `Operation not permitted in this context: save / ${modelName} / ${data}`,
    );
  },

  find: async (modelName: string, id: string): Promise<IData | undefined> => {
    throw new Error(
      `Operation not permitted in this context: find / ${modelName} / ${id}`,
    );
  },

  search: async (modelName: string, query: IQuery): Promise<IData[]> => {
    throw new Error(
      `Operation not permitted in this context: search / ${modelName} / ${query}`,
    );
  },
};
