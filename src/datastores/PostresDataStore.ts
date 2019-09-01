import { createLogger } from '@phnq/log';

// import { Client } from 'pg';
import { DataStore, Options, Query } from '../Datastore';
import { Data, ModelId } from '../Model';

const log = createLogger('postgresDataStore');

export class PostgresDataStore implements DataStore {
  private connUrl: string;
  // private client?: Client;

  constructor(connUrl: string) {
    this.connUrl = connUrl;
    log('connUrl', this.connUrl);
  }

  public async create(modelName: string, data: Data): Promise<ModelId> {
    log('save', modelName, data);
    throw new Error('Not yet');
  }

  public async update(modelName: string, data: Data): Promise<ModelId> {
    log('save', modelName, data);
    throw new Error('Not yet');
  }

  public async find(modelName: string, id: ModelId): Promise<Data | undefined> {
    log('find', modelName, id);
    throw new Error('Not yet');
  }

  public search(modelName: string, query: Query, options: Options): AsyncIterableIterator<Data> {
    log('search', modelName, query, options);
    throw new Error('Not yet');
  }

  public async drop(modelName: string): Promise<boolean> {
    log('drop', modelName);
    throw new Error('Not yet');
  }

  public async close(): Promise<void> {
    // if (this.client) {
    //   await this.client.end();
    // }
  }

  // private async getClient(): Promise<Client> {
  //   if (!this.client) {
  //     this.client = new Client();
  //     await this.client.connect();
  //   }
  //   return this.client;
  // }
}