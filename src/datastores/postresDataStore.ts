import { createLogger } from '@phnq/log';
// import { Client } from 'pg';
import { DataStore, Options, Query } from '../datastore';
import { Data, ModelId } from '../model';

const log = createLogger('postgresDataStore');

export class PostgresDataStore implements DataStore {
  private connUrl: string;
  // private client?: Client;

  constructor(connUrl: string) {
    this.connUrl = connUrl;
    log('connUrl', this.connUrl);
  }

  public async save(modelName: string, data: Data): Promise<ModelId> {
    log('save', modelName, data);
    throw new Error('Not yet');
  }

  public async find(modelName: string, id: ModelId): Promise<Data | undefined> {
    log('find', modelName, id);
    throw new Error('Not yet');
  }

  public async search(modelName: string, query: Query, options: Options): Promise<Data[]> {
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
