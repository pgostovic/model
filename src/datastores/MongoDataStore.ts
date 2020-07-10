import { createLogger } from '@phnq/log';
import mongodb, { Cursor, FilterQuery, FindOneOptions, IndexOptions } from 'mongodb';

import { DataStore, Options, SearchResult } from '../Datastore';
import { ModelData, ModelId } from '../Model';
import Query from '../Query';

const log = createLogger('mongoDataStore');

/**
 * Translates abstract ModelData into Mongo data. This is all about turning
 * ModelId instances into mongodb.ObjectId instances. Also:
 * - ModelId.Empty instances are omitted.
 * - Top-level ModelId instances named 'id' are renamed to _id.
 */
const mongify = (val: unknown, topLevel = true): unknown => {
  if (val instanceof Array) {
    return (val as unknown[]).map(v => mongify(v, false));
  } else if (val instanceof Date) {
    return val;
  } else if (val && typeof val === 'object') {
    if (val instanceof ModelId) {
      return new mongodb.ObjectId(val.toString());
    } else {
      const valObj = val as { [index: string]: unknown };
      const obj: { [index: string]: unknown } = {};
      Object.keys(valObj).forEach((k: string) => {
        const v = valObj[k];
        // Omit ModelId.Empty instances.
        if (v !== ModelId.Empty) {
          obj[k === 'id' && topLevel ? '_id' : k] = mongify(v, false);
        }
      });
      return obj;
    }
  }
  return val;
};

/**
 * Translates Mongo data into abstract ModelData. This is the inverse
 * of the mongify operation.
 */
const deMongify = (val: unknown, topLevel = true): unknown => {
  if (val instanceof Array) {
    return (val as unknown[]).map(v => deMongify(v, false));
  } else if (val instanceof Date) {
    return val;
  } else if (val && typeof val === 'object') {
    if (val instanceof mongodb.ObjectId) {
      return new ModelId(val.toString());
    } else {
      const valObj = val as { [index: string]: unknown };
      const obj: { [index: string]: unknown } = {};
      Object.keys(valObj).forEach((k: string) => {
        const v = valObj[k];
        obj[k === '_id' && topLevel ? 'id' : k] = deMongify(v, false);
      });
      return obj;
    }
  }
  return val;
};

export class MongoDataStore implements DataStore {
  private connUrl: string;
  private client?: mongodb.MongoClient;

  constructor(connUrl: string) {
    this.connUrl = connUrl;
  }

  public async create(modelName: string, data: ModelData): Promise<ModelId> {
    const col = await this.collection(modelName);
    return new ModelId((await col.insertOne(mongify(data))).insertedId);
  }

  public async update(modelName: string, data: ModelData): Promise<ModelId> {
    const col = await this.collection(modelName);
    const id = data.id;
    if (id instanceof ModelId) {
      await col.updateOne({ _id: new mongodb.ObjectId(id.toString()) }, { $set: mongify(data) });
      return id;
    }
    throw new Error('Must specify id to update a document');
  }

  public async find(modelName: string, id: ModelId, options?: Options): Promise<ModelData | undefined> {
    const col = await this.collection(modelName);
    try {
      return deMongify(
        (await col.findOne({ _id: new mongodb.ObjectId(id.toString()) }, toMongoFindOptions(options))) || undefined,
      ) as ModelData;
    } catch (err) {
      log('Error finding document', err);
      return undefined;
    }
  }

  public search(modelName: string, query: Query, options?: Options): SearchResult {
    const cursorPromise = (async (): Promise<Cursor> => {
      const col = await this.collection(modelName);
      return col.find(toMongoQuery(query) as FilterQuery<unknown>, toMongoFindOptions(options));
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
            yield data as ModelData;
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

const toMongoQuery = (val: unknown): unknown => {
  if (val instanceof ModelId) {
    return new mongodb.ObjectId(val.toString());
  } else if (val instanceof Array) {
    return (val as unknown[]).map(toMongoQuery);
  } else if (val && typeof val === 'object') {
    const valObj = val as { [index: string]: unknown };
    const obj: { [index: string]: unknown } = {};
    Object.keys(valObj).forEach((k: string) => {
      obj[k === 'id' ? '_id' : k] = toMongoQuery(valObj[k]);
    });
    return obj;
  }
  return val;
};

const toMongoFindOptions = (options?: Options): FindOneOptions | undefined => {
  if (options) {
    const { include = [], exclude = [], sort = [], limit, offset } = options;
    const mongoOptions: FindOneOptions = {};

    if (include.length + exclude.length > 0) {
      mongoOptions.projection = {};
      [...include, ...exclude].forEach(f => {
        mongoOptions.projection = { ...mongoOptions.projection, [f]: include.includes(f) ? 1 : 0 };
      });
    }

    if (sort.length > 0) {
      mongoOptions.sort = sort.map(s => {
        const m = s.match(/([+-]?)(.*)/);
        if (m) {
          const desc = m[1] === '-';
          const field = m[2];
          return [field, desc ? -1 : 1];
        }
      });
    }

    if (limit !== undefined) {
      mongoOptions.limit = limit;
    }

    if (offset !== undefined) {
      mongoOptions.skip = offset;
    }

    return mongoOptions;
  }
  return undefined;
};
