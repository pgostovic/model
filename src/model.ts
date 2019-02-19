import { findData, IQuery, saveData, searchData } from './datastore';

export type IValue = string | number | boolean | undefined;

export interface IData {
  [key: string]: IValue;
}

const isMutableByModel = new Map<any, boolean>();
const fieldNamesByModel = new Map<any, string[]>();

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

export const mutable = ((): any => (modelClass: Model) => {
  isMutableByModel.set(modelClass, true);
})();

abstract class Model<T extends IData = IData, C = any> {
  @field public id?: string;

  constructor(data: T) {
    const fieldNames = this.getFieldNames();

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

  private isMutable(): boolean {
    return isMutableByModel.get(this.constructor) || false;
  }

  private getFieldNames(): string[] {
    return (fieldNamesByModel.get(this.constructor) || []).concat(
      fieldNamesByModel.get(Model) || [],
    );
  }

  private getData(): IData {
    const data: IData = {};
    this.getFieldNames().forEach((key: string) => {
      const propDesc = Object.getOwnPropertyDescriptor(this, key);
      data[key] = (propDesc || {}).value;
    });
    return data;
  }
}

export default Model;

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
