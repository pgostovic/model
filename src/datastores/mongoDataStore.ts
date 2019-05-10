import { createLogger } from '@phnq/log';
import mongodb from 'mongodb';
import { IDataStore, IOptions, IQuery } from '../datastore';
import { IData } from '../model';

const log = createLogger('mongoDataStore');

export class MongoDataStore implements IDataStore {
  private connUrl: string;
  private client?: mongodb.MongoClient;

  constructor(connUrl: string) {
    this.connUrl = connUrl;
  }

  public async save(modelName: string, data: IData): Promise<string> {
    const col = await this.collection(modelName);
    const id = data.id as string;
    if (id) {
      const dataCopy = { ...data };
      delete dataCopy.id;
      await col.updateOne({ _id: new mongodb.ObjectId(id) }, { $set: dataCopy });
      return id;
    } else {
      return String((await col.insertOne(mongify(data))).insertedId);
    }
  }

  public async find(modelName: string, id: string): Promise<IData | undefined> {
    const col = await this.collection(modelName);
    return deMongify((await col.findOne({ _id: new mongodb.ObjectId(id) })) || undefined);
  }

  public async search(modelName: string, query: IQuery, options: IOptions): Promise<IData[]> {
    const col = await this.collection(modelName);

    const results: IData[] = [];
    await col.find(query, options).forEach(doc => {
      const data = deMongify(doc);
      if (data) {
        results.push(data);
      }
    });

    return results;
  }

  public async drop(modelName: string): Promise<boolean> {
    log('dropping ', modelName);
    try {
      const col = await this.collection(modelName);
      await col.drop();
      return true;
    } catch (err) {
      return false;
    }
  }

  public async close() {
    return (await this.getClient()).close();
  }

  public async createIndex(modelName: string, spec: any, options: any): Promise<void> {
    const col = await this.collection(modelName);
    return col.createIndex(spec, options);
  }

  private async collection(name: string) {
    return (await this.getClient()).db().collection(name);
  }

  private async getClient() {
    if (!this.client) {
      this.client = await mongodb.MongoClient.connect(this.connUrl, {
        useNewUrlParser: true,
      });
    }
    return this.client;
  }
}

const mongify = (data: IData) => {
  const id = data.id as string;
  if (id) {
    const dataCopy = { ...data, id, _id: new mongodb.ObjectId(id) };
    delete dataCopy.id;
    return dataCopy;
  } else {
    const dataCopy = { ...data };
    delete dataCopy.id;
    return dataCopy;
  }
};

const deMongify = (doc: IData | undefined): IData | undefined => {
  if (doc) {
    const id = doc._id ? doc._id.toString() : undefined;
    const docCopy = { ...doc, _id: undefined, id };
    delete docCopy._id;
    return docCopy as IData;
  }
  return undefined;
};
