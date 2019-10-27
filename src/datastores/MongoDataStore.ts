import { createLogger } from '@phnq/log';
import mongodb from 'mongodb';

import { DataStore, Options, Query } from '../Datastore';
import { Data, ModelId } from '../Model';

const log = createLogger('mongoDataStore');

const mongify = (data: Data): Data | { _id?: mongodb.ObjectId } => {
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

const deMongify = (doc: Data | undefined): Data | undefined => {
  if (doc && doc._id) {
    const id = doc._id.toString();
    const docCopy = { ...doc, _id: undefined, id };
    delete docCopy._id;
    return docCopy as Data;
  }
  return doc;
};

export class MongoDataStore implements DataStore {
  private connUrl: string;
  private client?: mongodb.MongoClient;

  constructor(connUrl: string) {
    this.connUrl = connUrl;
  }

  public async create(modelName: string, data: Data): Promise<ModelId> {
    const col = await this.collection(modelName);
    return String((await col.insertOne(mongify(data))).insertedId);
  }

  public async update(modelName: string, data: Data): Promise<ModelId> {
    const col = await this.collection(modelName);
    const id = data.id as ModelId;
    if (id) {
      await col.updateOne({ _id: new mongodb.ObjectId(id) }, { $set: mongify(data) });
      return id;
    }
    throw new Error('Must specify id to update a document');
  }

  public async find(modelName: string, id: ModelId): Promise<Data | undefined> {
    const col = await this.collection(modelName);
    try {
      return deMongify((await col.findOne({ _id: new mongodb.ObjectId(id) })) || undefined);
    } catch (err) {
      log('Error finding document', err);
      return undefined;
    }
  }

  public search(modelName: string, query: Query, options: Options): AsyncIterableIterator<Data> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const that = this;
    return (async function*() {
      const col = await that.collection(modelName);
      for await (const doc of col.find(query, options)) {
        const data = deMongify(doc);
        if (data) {
          yield data;
        }
      }
    })();
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

  public async close(): Promise<void> {
    return (await this.getClient()).close();
  }

  public async createIndex(modelName: string, spec: any, options: any): Promise<void> {
    const col = await this.collection(modelName);
    return col.createIndex(spec, options);
  }

  private async collection(name: string): Promise<mongodb.Collection> {
    return (await this.getClient()).db().collection(name);
  }

  private async getClient(): Promise<mongodb.MongoClient> {
    if (!this.client) {
      this.client = await mongodb.MongoClient.connect(this.connUrl, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
    }
    return this.client;
  }
}
