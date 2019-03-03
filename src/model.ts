import md5 from 'md5';
import { findData, IQuery, saveData, searchData } from './datastore';

export type IValue = string | number | boolean | IData | undefined;

export interface IData {
  [key: string]: IValue | IValue[];
}

const isMutableByModel = new Map<any, boolean>();
const fieldNamesByModel = new Map<any, string[]>();
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

export const field = ((): any => (
  model: Model<IData>,
  fieldName: string,
): void => {
  const modelClass = model.constructor;
  let fieldNames = fieldNamesByModel.get(modelClass);
  if (!fieldNames) {
    fieldNames = [];
    fieldNamesByModel.set(modelClass, fieldNames);
  }
  fieldNames.push(fieldName);
})();

export const mutable = ((): any => (modelClass: new () => Model) => {
  isMutableByModel.set(modelClass, true);
})();

export const classId = (cid: string): any => (modelClass: any) => {
  modelClass.cid = cid;
};

const getFieldNames = (modelClass: any): string[] => {
  return (fieldNamesByModel.get(modelClass) || []).concat(
    fieldNamesByModel.get(Model) || [],
  );
};

const getClassId = (modelClass: any): string => {
  return modelClass.cid || md5([...getFieldNames(modelClass)].sort().join(' '));
};

export abstract class Model<T extends IData = IData, C = any> {
  public static register() {
    modelClassesById.set(getClassId(this), this);
  }

  @field public id?: string;

  constructor(data: T) {
    const fieldNames = getFieldNames(this.constructor);

    const unsupportedKeys = Object.keys(data).filter(
      k => !fieldNames.includes(k),
    );

    if (unsupportedKeys.length > 0) {
      throw new Error(`Unsupported keys: ${unsupportedKeys.join(', ')}`);
    }

    for (const fieldName of fieldNames) {
      Object.defineProperty(this, fieldName, {
        enumerable: true,
        value: data[fieldName],
        writable: this.isMutable(),
      });
    }

    Object.seal(this);
  }

  public async save(): Promise<C> {
    const id = await saveData(this.constructor, this.getData());
    if (this.isMutable()) {
      this.id = id;
      return (this as any) as C;
    }
    return new (this.constructor as any)({ ...this.getData(), id });
  }

  public toJS(): IData {
    return {
      ...JSON.parse(JSON.stringify(this.getData())),
      _cid_: getClassId(this.constructor),
    };
  }

  private isMutable(): boolean {
    return isMutableByModel.get(this.constructor) || false;
  }

  private getData(): IData {
    const data: IData = {};
    getFieldNames(this.constructor).forEach((key: string) => {
      const propDesc = Object.getOwnPropertyDescriptor(this, key);
      data[key] = (propDesc || {}).value;
    });
    return data;
  }
}

// export default Model;

export const find = async <T extends Model<IData>>(
  c: new (...args: any[]) => T,
  id: string,
): Promise<T | undefined> => {
  const data = await findData(c, id);
  if (data) {
    return new c(data);
  }
  return undefined;
};

export const search = async <T extends Model<IData>>(
  c: new (...args: any[]) => T,
  query: IQuery,
): Promise<T[]> => (await searchData(c, query)).map(data => new c(data));
