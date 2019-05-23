import md5 from 'md5';
import 'reflect-metadata';
import { dropData, findData, IOptions, IQuery, saveData, searchData } from './datastore';

export type IValue = string | number | boolean | Date | IData | undefined;

export interface IData {
  [key: string]: IValue | IValue[];
}

const modelClassesById = new Map<string, any>();
const fieldTypesByModel = new Map<any, { [key: string]: FieldType }>();

const enum FieldType {
  String = 'string',
  Number = 'number',
  Date = 'date',
  Boolean = 'boolean',
  Object = 'object',
  Array = 'array',
}

export function field(model: any, key: string) {
  const type = Reflect.getMetadata('design:type', model, key);

  let fieldTypes = fieldTypesByModel.get(model.constructor);
  if (!fieldTypes) {
    fieldTypes = { ...fieldTypesByModel.get(Model) };
    fieldTypesByModel.set(model.constructor, fieldTypes);
  }

  switch (type) {
    case String:
      fieldTypes[key] = FieldType.String;
      break;
    case Number:
      fieldTypes[key] = FieldType.Number;
      break;
    case Date:
      fieldTypes[key] = FieldType.Date;
      break;
    case Boolean:
      fieldTypes[key] = FieldType.Boolean;
      break;
    case Object:
      fieldTypes[key] = FieldType.Object;
      break;
    case Array:
      fieldTypes[key] = FieldType.Array;
      break;
    default:
      throw new Error(`Unsupported field type: ${type}`);
  }
}

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

export type ModelParams<T> = { [K in Exclude<keyof T, Exclude<keyof Model, 'id'>>]?: T[K] };

export abstract class Model<T = IData> {
  public static register() {
    modelClassesById.set(getClassId(this), this);
  }

  public static drop() {
    return dropData(this);
  }

  public static getFieldTypes() {
    return fieldTypesByModel.get(this);
  }

  @field public id?: string;

  constructor(data: ModelParams<T>) {
    const fieldNames = Object.keys((this.constructor as any).getFieldTypes());

    for (const fieldName of fieldNames) {
      Object.defineProperty(this, fieldName, {
        enumerable: true,
        value: (data as IData)[fieldName],
        writable: true,
      });
    }
  }

  public freeze() {
    Object.freeze(this);
    return this;
  }

  public async save(): Promise<this> {
    const id = await saveData(this.constructor, this.getData());
    if (Object.isFrozen(this)) {
      return new (this.constructor as any)({ ...this.getData(), id });
    }
    this.id = id;
    return this;
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
