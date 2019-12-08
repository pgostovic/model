/* eslint-disable @typescript-eslint/no-use-before-define */

import cloneDeep from 'lodash.clonedeep';
import md5 from 'md5';

import Cursor from './Cursor';
import { createData, dropData, findData, Options, Query, searchData, updateData } from './Datastore';

export type ModelId = string;

export type Value = string | number | boolean | Date | Data | undefined;

export interface Data {
  [key: string]: Value | Value[];
}

export type HasId = { id: ModelId };

const modelClassesById = new Map<string, typeof Model>();
const fieldNamesByModel = new Map<Function, string[]>();

export const field = (model: Model, key: string): void => {
  const modelCls = model.constructor;

  const fieldNames = fieldNamesByModel.get(modelCls) || ['id'];
  fieldNames.push(key);
  fieldNamesByModel.set(modelCls, fieldNames);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const classId = (cid: string): any => (modelClass: { cid?: string }) => {
  modelClass.cid = cid;
};

const getClassId = (modelClass: { cid?: string; name: string }): string => {
  return modelClass.cid || md5(modelClass.name);
};

export class Model {
  public static register(): void {
    modelClassesById.set(getClassId(this), this);
  }

  public static drop(): Promise<boolean> {
    return dropData(this);
  }

  public static async find<T = Model>(id: ModelId): Promise<T & HasId | undefined> {
    return find(this, id) as Promise<T & HasId | undefined>;
  }

  @field public id?: ModelId;
  public persistedData?: Data = undefined;

  constructor() {
    Object.defineProperty(this, 'persistedData', { value: undefined, writable: true, enumerable: false });
  }

  public async save(): Promise<this & HasId> {
    const saveOp = this.persistedData ? updateData : createData;
    const id = await saveOp(this.constructor, this.getData());
    if (Object.isFrozen(this)) {
      const clone = this.clone();
      clone.id = id;
      clone.persistedData = cloneDeep(this.getData());
      return clone as this & HasId;
    }
    this.id = id;
    this.persistedData = cloneDeep(this.getData());
    return this as this & HasId;
  }

  private getData(): Data {
    const fieldNames = getFieldNames(this.constructor);
    const data: Data = {};
    fieldNames.forEach((key: string) => {
      const value = (Object.getOwnPropertyDescriptor(this, key) || {}).value;
      if (value !== undefined) {
        data[key] = value;
      }
    });
    return data;
  }

  public toJS(): Data {
    return Object.freeze({
      ...this.clone().getData(),
      _cid_: getClassId(this.constructor),
      _isPersisted_: this.persistedData !== undefined,
    });
  }

  public clone(): this {
    const model = new Model();
    Object.assign(model, cloneDeep(this.getData()));
    Object.setPrototypeOf(model, this.constructor.prototype);
    return (model as unknown) as this;
  }

  public freeze(): this {
    return Object.freeze(this);
  }
}

export const fromJS = <T>(js: Data, mClass?: typeof Model): T => {
  const cid = js._cid_ as string;
  const isPersisted = js._isPersisted_ as boolean;
  const modelClass = mClass || modelClassesById.get(cid);
  if (modelClass) {
    const data: Data = {};
    const fieldNames = getFieldNames(modelClass);
    fieldNames.forEach(name => {
      data[name] = js[name];
    });

    const model = new Model();
    Object.assign(model, data);
    Object.setPrototypeOf(model, modelClass.prototype);
    if (isPersisted) {
      model.persistedData = cloneDeep(data);
    }
    return (model as unknown) as T;
  }
  throw new Error(`No model class registered for id: ${cid}`);
};

export const find = async <T extends Model>(
  c: new (...args: any[]) => T,
  id: ModelId,
): Promise<T & HasId | undefined> => {
  const data = await findData(c, id);
  if (data) {
    const model = new Model();
    model.persistedData = cloneDeep(data);
    Object.assign(model, data);
    Object.setPrototypeOf(model, c.prototype);
    return (model as unknown) as T & HasId;
  }
};

export const search = <T extends Model>(
  c: new (...args: any[]) => T,
  query: Query,
  options: Options = undefined,
): Cursor<T> => new Cursor<T>(c, searchData(c, query, options));

export const all = async <T>(cursor: AsyncIterableIterator<T>): Promise<T[]> => {
  const records: T[] = [];
  for await (const record of cursor) {
    records.push(record);
  }
  return records;
};

const getFieldNames = (modelClass: Function): string[] => {
  const fieldNames = new Set<string>();
  let mc = modelClass;
  do {
    (fieldNamesByModel.get(mc) || []).forEach(fieldName => {
      fieldNames.add(fieldName);
    });
    mc = Object.getPrototypeOf(mc);
  } while (mc !== Model);
  return [...fieldNames];
};
