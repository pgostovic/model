import { PersistObserver, PersistOperation } from './DataStore';
import { field, Model, ModelData, ModelId, search } from './Model';

enum AuditEventOperation {
  Create = 'create',
  Update = 'update',
  Delete = 'delete',
  Drop = 'drop',
}

export class AuditEvent extends Model {
  @field public eventOperation: AuditEventOperation;
  @field public collectionName: string;
  @field public data: ModelData;
  @field public created = new Date();

  public constructor(eventOperation: AuditEventOperation, collectionName: string, data: ModelData) {
    super();
    this.eventOperation = eventOperation;
    this.collectionName = collectionName;
    this.data = data;
  }
}

const getEventOp = (op: PersistOperation): AuditEventOperation => {
  switch (op) {
    case PersistOperation.Create:
      return AuditEventOperation.Create;
    case PersistOperation.Update:
      return AuditEventOperation.Update;
    case PersistOperation.Delete:
      return AuditEventOperation.Delete;
    case PersistOperation.Drop:
      return AuditEventOperation.Drop;
  }
};

class AuditLogger implements PersistObserver {
  observe(op: PersistOperation, collectionName: string, data: ModelData): void {
    if (collectionName !== 'AuditEvent') {
      new AuditEvent(getEventOp(op), collectionName, data).save();
    }
  }

  async reconstruct(): Promise<{ [key: string]: ModelData[] }> {
    const obj: { [key: string]: ModelData[] } = {};

    for await (const event of search(AuditEvent, {}).iterator) {
      const col = obj[event.collectionName] || [];

      switch (event.eventOperation) {
        case AuditEventOperation.Create:
          col.push(event.data);
          obj[event.collectionName] = col;
          break;

        case AuditEventOperation.Update: {
          const data = col.find(d => {
            return (d.id as ModelId).equals(event.data.id as ModelId);
          });
          if (data) {
            Object.assign(data, event.data);
          } else {
            console.log('Could not find record:', event);
          }
          break;
        }

        case AuditEventOperation.Delete:
          obj[event.collectionName] = col.filter(data => !(data.id as ModelId).equals(event.data.id as ModelId));
          break;

        case AuditEventOperation.Drop:
          delete obj[event.collectionName];
          break;
      }
    }

    return obj;
  }
}

export default AuditLogger;
