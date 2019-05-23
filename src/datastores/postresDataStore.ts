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
    throw new Error('Not yet');
  }

  public async find(modelName: string, id: string): Promise<IData | undefined> {
    throw new Error('Not yet');
  }

  public async search(modelName: string, query: IQuery, options: IOptions): Promise<IData[]> {
    throw new Error('Not yet');
  }

  public async drop(modelName: string): Promise<boolean> {
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
