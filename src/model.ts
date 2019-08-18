/* eslint-disable @typescript-eslint/no-use-before-define */

import md5 from 'md5';
import cloneDeep from 'lodash.clonedeep';
import { findData, searchData, Query, Options, saveData, dropData } from './datastore';

export type ModelId = string;

export type Value = string | number | boolean | Date | Data | undefined;

export interface Data {
  [key: string]: Value | Value[];
}

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

  @field public id?: ModelId;

  public async save(): Promise<this> {
    const id = await saveData(this.constructor, this.getData());
    if (Object.isFrozen(this)) {
      const clone = this.clone();
      clone.id = id;
      return clone;
    }
    this.id = id;
    return this;
  }

  private getData(): Data {
    const fieldNames = fieldNamesByModel.get(this.constructor) || [];
    const data: Data = {};
    fieldNames.forEach((key: string) => {
      data[key] = (Object.getOwnPropertyDescriptor(this, key) || {}).value;
    });
    return data;
  }

  public toJS(): Data {
    return Object.freeze({
      ...this.clone().getData(),
      _cid_: getClassId(this.constructor),
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
  const modelClass = mClass || modelClassesById.get(cid);
  if (modelClass) {
    const data: Data = {};
    const fieldNames = fieldNamesByModel.get(modelClass) || [];
    fieldNames.forEach(name => {
      data[name] = js[name];
    });

    const model = new Model();
    Object.assign(model, data);
    Object.setPrototypeOf(model, modelClass.prototype);
    return (model as unknown) as T;
  }
  throw new Error(`No model class registered for id: ${cid}`);
};

export const find = async <T>(c: new (...args: any[]) => T, id: ModelId): Promise<T | undefined> => {
  const data = await findData(c, id);
  if (data) {
    const model = new Model();
    Object.assign(model, data);
    Object.setPrototypeOf(model, c.prototype);
    return (model as unknown) as T;
  }
};

export const search = async <T>(
  c: new (...args: any[]) => T,
  query: Query,
  options: Options = undefined,
): Promise<T[]> => (await searchData(c, query, options)).map(data => new c(data));
