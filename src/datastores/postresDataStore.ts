import { createLogger } from '@phnq/log';
import { Client } from 'pg';
import { IDataStore, IOptions, IQuery } from '../datastore';
import { IData } from '../model';

const log = createLogger('postgresDataStore');

export class PostgresDataStore implements IDataStore {
  private connUrl: string;
  private client?: Client;

  constructor(connUrl: string) {
    this.connUrl = connUrl;
  }

  public async save(modelName: string, data: IData): Promise<string> {
    log('save', modelName, data, this.getClient());
    throw new Error('Not yet');
  }

  public async find(modelName: string, id: string): Promise<IData | undefined> {
    log('find', modelName, id);
    throw new Error('Not yet');
  }

  public async search(modelName: string, query: IQuery, options: IOptions): Promise<IData[]> {
    log('search', modelName, query, options);
    throw new Error('Not yet');
  }

  public async drop(modelName: string): Promise<boolean> {
    log('drop', modelName);
    throw new Error('Not yet');
  }

  public async close() {
    if (this.client) {
      await this.client.end();
    }
  }

  private async getClient(): Promise<Client> {
    if (!this.client) {
      this.client = new Client();
      await this.client.connect();
    }
    return this.client;
  }
}
