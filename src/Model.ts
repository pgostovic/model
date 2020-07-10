/* eslint-disable @typescript-eslint/no-use-before-define */
import { createLogger } from '@phnq/log';
import cloneDeep from 'lodash.clonedeep';

import Cursor from './Cursor';
import { createData, dropData, findData, Options, searchData, updateData } from './Datastore';
import { QueryType } from './Query';

const log = createLogger('Model');

export class ModelId {
  public static readonly Empty = new ModelId('');

  private _modelId_: string;

  public constructor(id: string | number) {
    this._modelId_ = String(id);
    if (id === '') {
      return ModelId.Empty;
    }
  }

  public toString(): string {
    return this._modelId_;
  }

  public equals(id: ModelId): boolean {
    return this._modelId_ === id.toString();
  }
}

export interface ModelData {
  [key: string]: unknown;
}

const registeredClasses = new Map<string, typeof Model>();
const fieldNamesByModel = new Map<Function, string[]>();

export const field = (model: Model, key: string): void => {
  const modelCls = model.constructor;
  const fieldNames = fieldNamesByModel.get(modelCls) || ['id'];
  fieldNames.push(key);
  fieldNamesByModel.set(modelCls, fieldNames);
};

export class Model {
  public static get classes(): Array<typeof Model> {
    return getClasses(this);
  }

  public static get class(): typeof Model {
    const classes = this.classes;
    return classes[classes.length - 1];
  }

  public static get baseClass(): typeof Model {
    return this.classes[0];
  }

  public static get classNames(): string[] {
    return this.classes.map(c => c.name);
  }

  public static get collectionName(): string {
    this.register();
    return this.classNames[0];
  }

  private static get cid(): string {
    const classNames = this.classNames;
    return classNames[classNames.length - 1];
  }

  public static register(): void {
    registeredClasses.set(this.cid, this);
  }

  public static drop(): Promise<boolean> {
    return dropData(this);
  }

  public static parse<T = unknown>(val: unknown): T {
    return parse(val) as T;
  }

  @field public readonly id = ModelId.Empty;
  public persisted?: this = undefined;
  public _classes_: string[] = [];

  constructor() {
    Object.defineProperty(this, 'persisted', { value: undefined, writable: true, enumerable: false });
    Object.defineProperty(this, '_classes_', { enumerable: true, get: () => this.getClass().classNames });
  }

  public async save(): Promise<this> {
    const saveOp = this.persisted ? updateData : createData;
    const js = this.toJS();

    const id = await saveOp(
      this.getClass(),
      Object.keys(js).reduce((data, k) => (k === '_isPersisted_' ? data : { ...data, [k]: js[k] }), { id: this.id }),
    );
    const model = new Model();
    Object.assign(model, { ...cloneDeep(this.getData()), id });
    Object.setPrototypeOf(model, this.constructor.prototype);
    model.persisted = model.clone();
    return model as this;
  }

  private getData(): ModelData {
    const fieldNames = getFieldNames(this.getClass());
    const data: ModelData = { id: this.id };
    fieldNames.forEach((key: string) => {
      const value = (Object.getOwnPropertyDescriptor(this, key) || {}).value;
      if (value !== undefined) {
        data[key] = value;
      }
    });
    return data;
  }

  public toJS(): ModelData {
    return Object.freeze({
      ...this.clone().getData(),
      _classes_: this._classes_,
      _isPersisted_: this.persisted !== undefined,
    });
  }

  public clone(): this {
    const model = new Model();
    const dataClone = cloneDeep(this.getData());
    if (dataClone.id instanceof ModelId && dataClone.id.equals(ModelId.Empty)) {
      dataClone.id = ModelId.Empty;
    }
    Object.assign(model, dataClone);
    Object.setPrototypeOf(model, this.constructor.prototype);
    return model as this;
  }

  public freeze(): this {
    return Object.freeze(this);
  }

  public getClass(): typeof Model {
    return Object.getPrototypeOf(this).constructor;
  }
}

const fromJS = <T extends Model>(js: ModelData, mClass?: typeof Model): T => {
  const classes = js._classes_ as string[];
  const cid = classes[classes.length - 1] as string;
  const isPersisted = js._isPersisted_ as boolean;
  const modelClass = mClass || registeredClasses.get(cid);
  if (modelClass) {
    const data: ModelData = { id: ModelId.Empty };
    const fieldNames = getFieldNames(modelClass);
    fieldNames.forEach(name => {
      data[name] = js[name];
    });

    const model = new Model();
    Object.assign(model, data);
    Object.setPrototypeOf(model, modelClass.prototype);
    if (isPersisted) {
      model.persisted = model.clone();
    }
    return model as T;
  }
  throw new Error(`No model class registered for id: ${cid}`);
};

export const find = async <T extends Model>(
  c: { new (...args: never[]): T },
  id: ModelId,
  options?: Options,
): Promise<T | undefined> => {
  if (options && options.include) {
    options.include = [...options.include, '_classes_', '_isPersisted_'];
  }

  const data = await findData((c as unknown) as typeof Model, id, options);
  if (data) {
    const result = fromJS({ ...data, _isPersisted_: true });
    if (result instanceof c) {
      return result;
    }
  }
  return undefined;
};

export const search = <T extends Model>(
  c: { new (...args: never[]): T },
  query: QueryType,
  options?: Options,
): Cursor<T> => {
  const modelClass = (c as unknown) as typeof Model;

  if (options && options.include) {
    options.include = [...options.include, '_classes_', '_isPersisted_'];
  }

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

/**
 * Finds serialized Model instances and instantiates them as proper typed Models using fromJS().
 * If an object has a _classes_ key then it is assumed to be a serialized Model instance.
 * If fromJS() fails then a warning is logged and the object is passed through.
 *
 * NOTE: this function is intended for deserializing data that may contain embedded serialized Model
 * instances -- i.e. data transmitted over a network.
 *
 * @param val some data
 */
const parse = (val: unknown): unknown => {
  if (val instanceof Array) {
    return (val as unknown[]).map(parse);
  } else if (val instanceof Date || val instanceof ModelId || val instanceof Model) {
    return val;
  } else if (val && typeof val === 'object') {
    const valObj = val as { [index: string]: unknown };
    if (valObj._classes_) {
      try {
        return fromJS(valObj);
      } catch (err) {
        const className = [...(valObj._classes_ as string[])].pop();
        log.warn(`Unable to unmarshal instance of Model class: ${className}`);
      }
    } else if (valObj._modelId_ && typeof valObj._modelId_ === 'string') {
      return new ModelId(valObj._modelId_);
    }
    const obj: { [index: string]: unknown } = {};
    Object.keys(valObj).forEach((k: string) => {
      obj[k] = parse(valObj[k]);
    });
    return obj;
  }
  return val;
};
