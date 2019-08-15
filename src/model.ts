/* eslint-disable @typescript-eslint/no-use-before-define */
import md5 from 'md5';
import 'reflect-metadata';
import { dropData, findData, IOptions, IQuery, saveData, searchData } from './datastore';

export type Value = string | number | boolean | Date | Data | undefined;

export interface Data {
  [key: string]: Value | Value[];
}

const modelClassesById = new Map<string, any>();
const fieldTypesByModel = new Map<any, FieldTypes>();

const enum FieldType {
  String = 'string',
  Number = 'number',
  Date = 'date',
  Boolean = 'boolean',
  Object = 'object',
  Array = 'array',
}

type FieldTypes = { [key: string]: FieldType };

export function field(model: Model, key: string): void {
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

export const fromJS = <T>(js: Data): T => {
  const cid = js._cid_ as string;
  const modelClass = modelClassesById.get(cid);
  if (modelClass) {
    const data: Data = {};
    Object.keys(js)
      .filter(k => k !== '_cid_')
      .forEach(k => {
        data[k] = js[k];
      });
    return new modelClass(data);
  }
  throw new Error(`No model class registered for id: ${cid}`);
};

export const classId = (cid: string): any => (modelClass: ModelClass) => {
  modelClass.cid = cid;
};

const getClassId = (modelClass: any): string => {
  return modelClass.cid || md5(modelClass.name);
};

export type ModelParams<T> = { [K in Exclude<keyof T, Exclude<keyof Model, 'id'>>]?: T[K] };

export type ModelId = string;

type ModelClass = { new (): Model; cid: string };

export abstract class Model<T = Data> {
  public static register(): void {
    modelClassesById.set(getClassId(this), this);
  }

  public static drop(): Promise<boolean> {
    return dropData(this);
  }

  public static getFieldTypes(): FieldTypes | undefined {
    return fieldTypesByModel.get(this);
  }

  @field public id?: ModelId;

  constructor(data: ModelParams<T>) {
    const fieldNames = Object.keys((this.constructor as any).getFieldTypes());

    for (const fieldName of fieldNames) {
      Object.defineProperty(this, fieldName, {
        enumerable: true,
        value: (data as Data)[fieldName],
        writable: true,
      });
    }
  }

  public freeze(): this {
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

  public toJS(): Data {
    return {
      ...JSON.parse(JSON.stringify(this.getData())),
      _cid_: getClassId(this.constructor),
    };
  }

  private getData(): Data {
    const data: Data = {};
    Object.keys(this).forEach((key: string) => {
      data[key] = (Object.getOwnPropertyDescriptor(this, key) || {}).value;
    });
    return data;
  }
}

export const find = async <T>(c: new (...args: any[]) => T, id?: ModelId): Promise<T | undefined> => {
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
