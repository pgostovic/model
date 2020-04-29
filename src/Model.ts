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

const registeredClasses = new Map<string, typeof Model>();
const fieldNamesByModel = new Map<Function, string[]>();

export const field = (model: Model, key: string): void => {
  const modelCls = model.constructor;
  const fieldNames = fieldNamesByModel.get(modelCls) || ['id'];
  fieldNames.push(key);
  fieldNamesByModel.set(modelCls, fieldNames);
};

export class Model {
  public static get classNames(): string[] {
    return getClasses(this).map(c => c.name);
  }

  public static get collectionName(): string {
    this.register();
    return this.classNames[0];
  }

  public static get cid(): string {
    const classNames = this.classNames;
    return md5(classNames[classNames.length - 1]);
  }

  public static register(): void {
    registeredClasses.set(this.cid, this);
  }

  public static drop(): Promise<boolean> {
    return dropData(this);
  }

  public static async find<T = Model>(id: ModelId): Promise<(T & HasId) | undefined> {
    return find(this, id) as Promise<(T & HasId) | undefined>;
  }

  @field public id?: ModelId;
  public persistedData?: Data = undefined;

  constructor() {
    Object.defineProperty(this, 'persistedData', { value: undefined, writable: true, enumerable: false });
  }

  public async save(): Promise<this & HasId> {
    const saveOp = this.persistedData ? updateData : createData;
    const id = await saveOp(this.getClass(), this.toJS());
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
    const fieldNames = getFieldNames(this.getClass());
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
      _cid_: this.getClass().cid,
      _classes_: this.getClass().classNames,
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

  public getClass(): typeof Model {
    return Object.getPrototypeOf(this).constructor;
  }
}

export const fromJS = <T extends Model>(js: Data, mClass?: typeof Model): T => {
  const cid = js._cid_ as string;
  const isPersisted = js._isPersisted_ as boolean;
  const modelClass = mClass || registeredClasses.get(cid);
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
    return model as T;
  }
  throw new Error(`No model class registered for id: ${cid}`);
};

export const find = async <T extends Model>(
  c: { new (...args: never[]): T },
  id: ModelId,
): Promise<(T & HasId) | undefined> => {
  const data = await findData((c as unknown) as typeof Model, id);
  if (data) {
    const result = fromJS({ ...data, _isPersisted_: true });
    if (result instanceof c) {
      return result as T & HasId;
    }
  }
  return undefined;
};

export const search = <T extends Model>(
  c: { new (...args: never[]): T },
  query: Query,
  options: Options = undefined,
): Cursor<T> => {
  const modelClass = (c as unknown) as typeof Model;
  // TODO: Need to add class names to the query.
  return new Cursor<T>(searchData(modelClass, query, options), m => m.getClass().classNames.includes(modelClass.name));
};

export const all = async <T>(cursor: AsyncIterableIterator<T>): Promise<T[]> => {
  const records: T[] = [];
  for await (const record of cursor) {
    records.push(record);
  }
  return records;
};

const getFieldNames = (modelClass: typeof Model): string[] => [
  ...new Set(
    getClasses(modelClass).reduce(
      (fieldNames, mc) => [...fieldNames, ...(fieldNamesByModel.get(mc) || [])],
      [] as string[],
    ),
  ),
];

const getClasses = (concreteModelClass: typeof Model): Array<typeof Model> => {
  let modelClass = concreteModelClass;
  const classes: Array<typeof Model> = [];
  do {
    classes.push(modelClass);
    modelClass = Object.getPrototypeOf(modelClass);
  } while (modelClass && modelClass !== Model);
  classes.reverse();
  return classes;
};
