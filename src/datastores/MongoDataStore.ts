import { createLogger } from '@phnq/log';
import mongodb, { Cursor, FilterQuery, FindOneOptions, IndexOptions } from 'mongodb';

import { DataStore, Options, Query, SearchResult } from '../Datastore';
import { ModelData, ModelId } from '../Model';

const log = createLogger('mongoDataStore');

const mongify = (data: ModelData): ModelData | { _id?: mongodb.ObjectId } => {
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

const deMongify = (doc: ModelData | undefined): ModelData | undefined => {
  if (doc && doc._id) {
    const id = (doc._id as mongodb.ObjectId).toString();
    const docCopy = { ...doc, _id: undefined, id };
    delete docCopy._id;
    return docCopy as ModelData;
  }
  return doc;
};

export class MongoDataStore implements DataStore {
  private connUrl: string;
  private client?: mongodb.MongoClient;

  constructor(connUrl: string) {
    this.connUrl = connUrl;
  }

  public async create(modelName: string, data: ModelData): Promise<ModelId> {
    const col = await this.collection(modelName);
    return String((await col.insertOne(mongify(data))).insertedId);
  }

  public async update(modelName: string, data: ModelData): Promise<ModelId> {
    const col = await this.collection(modelName);
    const id = data.id as ModelId;
    if (id) {
      await col.updateOne({ _id: new mongodb.ObjectId(id) }, { $set: mongify(data) });
      return id;
    }
    throw new Error('Must specify id to update a document');
  }

  public async find(modelName: string, id: ModelId): Promise<ModelData | undefined> {
    const col = await this.collection(modelName);
    try {
      return deMongify((await col.findOne({ _id: new mongodb.ObjectId(id) })) || undefined);
    } catch (err) {
      log('Error finding document', err);
      return undefined;
    }
  }

  public search(modelName: string, query: Query, options: Options): SearchResult {
    const cursorPromise = (async (): Promise<Cursor> => {
      const col = await this.collection(modelName);
      return col.find(query as FilterQuery<unknown>, options as FindOneOptions);
    })();

    return {
      count: new Promise<number>(async resolve => {
        const cursor = await cursorPromise;
        resolve(await cursor.count());
      }),
      iterator: (async function*() {
        const cursor = await cursorPromise;
        for await (const doc of cursor) {
          const data = deMongify(doc);
          if (data) {
            yield data;
          }
        }
      })(),
    };
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

  public async createIndex(modelName: string, spec: unknown, options: unknown): Promise<void> {
    const col = await this.collection(modelName);
    await col.createIndex(spec, options as IndexOptions);
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
