import md5 from 'md5';
import { dropData, findData, IOptions, IQuery, saveData, searchData } from './datastore';

export type IValue = string | number | boolean | Date | IData | undefined;

export interface IData {
  [key: string]: IValue | IValue[];
}

const modelClassesById = new Map<string, any>();

export const fromJS = <T>(js: IData): T => {
  const cid = js._cid_ as string;
  const modelClass = modelClassesById.get(cid);
  if (modelClass) {
    const data: IData = {};
    Object.keys(js)
      .filter(k => k !== '_cid_')
      .forEach(k => {
        data[k] = js[k];
      });
    return new modelClass(data);
  }
  throw new Error(`No model class registered for id: ${cid}`);
};

export const classId = (cid: string): any => (modelClass: any) => {
  modelClass.cid = cid;
};

const getClassId = (modelClass: any): string => {
  return modelClass.cid || md5(modelClass.name);
};

// TODO: restrict values to IValue type
export interface IModel {
  id?: string;
}

export abstract class Model<T extends IModel> {
  public static register() {
    modelClassesById.set(getClassId(this), this);
  }

  public static drop() {
    return dropData(this);
  }

  public id?: string;

  constructor(data: T) {
    const fieldNames = Object.keys(data) as Array<keyof T>;

    for (const fieldName of fieldNames) {
      Object.defineProperty(this, fieldName, {
        enumerable: true,
        value: data[fieldName],
        writable: true,
      });
    }
  }

  public freeze() {
    Object.freeze(this);
    return this;
  }

  public async save(): Promise<T> {
    const id = await saveData(this.constructor, this.getData());
    if (Object.isFrozen(this)) {
      return new (this.constructor as any)({ ...this.getData(), id });
    }
    this.id = id;
    return (this as any) as T;
  }

  public toJS(): IData {
    return {
      ...JSON.parse(JSON.stringify(this.getData())),
      _cid_: getClassId(this.constructor),
    };
  }

  private getData(): IData {
    const data: IData = {};
    Object.keys(this).forEach((key: string) => {
      data[key] = (Object.getOwnPropertyDescriptor(this, key) || {}).value;
    });
    return data;
  }
}

export const find = async <T>(c: new (...args: any[]) => T, id?: string): Promise<T | undefined> => {
  if (id) {
    const data = await findData(c, id);
    if (data) {
      return new c(data);
    }
  }
  return undefined;
};

export const search = async <T>(
  c: new (...args: any[]) => T,
  query: IQuery,
  options: IOptions = undefined,
): Promise<T[]> => (await searchData(c, query, options)).map(data => new c(data));
