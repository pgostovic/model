import md5 from 'md5';
import { dropData, findData, IQuery, saveData, searchData } from './datastore';

export type IValue = string | number | boolean | Date | IData | undefined;

export interface IData {
  [key: string]: IValue | IValue[];
}

const modelClassesById = new Map<string, any>();

export const fromJS = <T extends Model<IData>>(js: IData): T => {
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

export interface IModel {
  id?: string;
}

export abstract class Model<T = IData> implements IModel {
  public static register() {
    modelClassesById.set(getClassId(this), this);
  }

  public static drop() {
    return dropData(this);
  }

  public id?: string;

  constructor(data: T & IModel) {
    const fieldNames = Object.keys(data) as Array<keyof T & IModel>;

    for (const fieldName of fieldNames) {
      Object.defineProperty(this, fieldName, {
        enumerable: true,
        value: data[fieldName],
        writable: true,
      });
    }
  }

  public freeze(): T & IModel {
    return Object.freeze<T & IModel>((this as unknown) as T & IModel);
  }

  public async save(): Promise<T & IModel> {
    const id = await saveData(this.constructor, this.getData());
    if (Object.isFrozen(this)) {
      this.id = id;
      return (this as any) as T & IModel;
    }
    return new (this.constructor as any)({ ...this.getData(), id });
  }

  public toJS(): IData {
    return {
      ...JSON.parse(JSON.stringify(this.getData())),
      _cid_: getClassId(this.constructor),
    };
  }

  private getData(): IData {
    const data: IData = {};
    const fieldNames = Object.keys(this);
    fieldNames.forEach((key: string) => {
      const propDesc = Object.getOwnPropertyDescriptor(this, key);
      data[key] = (propDesc || {}).value;
    });
    return data;
  }
}

export const find = async <T extends Model<IData>>(
  c: new (...args: any[]) => T,
  id?: string,
): Promise<T | undefined> => {
  if (id) {
    const data = await findData(c, id);
    if (data) {
      return new c(data);
    }
  }
  return undefined;
};

export const search = async <T extends Model<IData>>(
  c: new (...args: any[]) => T,
  query: IQuery,
): Promise<T[]> => (await searchData(c, query)).map(data => new c(data));
