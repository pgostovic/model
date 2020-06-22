/* eslint-disable @typescript-eslint/no-use-before-define */
import cloneDeep from 'lodash.clonedeep';

import Cursor from './Cursor';
import { createData, dropData, findData, Options, Query, searchData, updateData } from './Datastore';

export type ModelId = string;

export interface ModelData {
  id?: ModelId;
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

  @field public readonly id: ModelId = '';
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
      Object.keys(js).reduce((data, k) => (k === '_isPersisted_' ? data : { ...data, [k]: js[k] }), {}),
    );
    const model = new Model();
    Object.assign(model, cloneDeep({ ...this.getData(), id }));
    Object.setPrototypeOf(model, this.constructor.prototype);
    model.persisted = model.clone();
    return model as this;
  }

  private getData(): ModelData {
    const fieldNames = getFieldNames(this.getClass());
    const data: ModelData = {};
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
    Object.assign(model, cloneDeep(this.getData()));
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

export const fromJS = <T extends Model>(js: ModelData, mClass?: typeof Model): T => {
  const classes = js._classes_ as string[];
  const cid = classes[classes.length - 1] as string;
  const isPersisted = js._isPersisted_ as boolean;
  const modelClass = mClass || registeredClasses.get(cid);
  if (modelClass) {
    const data: ModelData = {};
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
  query: Query,
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

const parse = (val: unknown): unknown => {
  if (val instanceof Array) {
    return (val as unknown[]).map(parse);
  } else if (val && typeof val === 'object') {
    const md = val as ModelData;
    if (md._classes_) {
      return fromJS(md);
    } else {
      const obj: { [index: string]: unknown } = {};
      Object.keys(md).forEach((k: string) => {
        obj[k] = parse(md[k]);
      });
      return obj;
    }
  }
  return val;
};
