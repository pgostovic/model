type OpInfo = [string, keyof Operation, unknown];
type JoinType = '$and' | '$or' | '';

interface SerializedQuery {
  [key: string]: unknown;
}

export class AbstractQuery {
  public static serialize(query: QueryType): SerializedQuery {
    if (query instanceof AbstractQuery) {
      const [name, op, value] = query.opInfo;
      const serOpInfo = { [name]: { [`$${op}`]: value } };

      if (!query.joinType) {
        return serOpInfo;
      }
      return {
        [query.joinType]: [serOpInfo, ...query.queries.map(q => AbstractQuery.serialize(q))],
      };
    } else {
      return query;
    }
  }

  private readonly opInfo: OpInfo;
  private readonly queries: AbstractQuery[];
  private readonly joinType: JoinType;

  constructor(opInfo: OpInfo, joinType: JoinType = '', queries: AbstractQuery[] = []) {
    this.opInfo = opInfo;
    this.joinType = joinType;
    this.queries = queries;
  }

  and(query: AbstractQuery): AbstractQuery {
    if (this.joinType === '$or') {
      throw new Error('Query is already an OR query');
    }
    return new AbstractQuery(this.opInfo, '$and', [...this.queries, query]);
  }

  or(query: AbstractQuery): AbstractQuery {
    if (this.joinType === '$and') {
      throw new Error('Query is already an AND query');
    }
    return new AbstractQuery(this.opInfo, '$or', [...this.queries, query]);
  }
}

class Operation {
  private readonly name: string;

  constructor(name: string) {
    this.name = name;
  }

  eq(value: unknown): AbstractQuery {
    return new AbstractQuery([this.name, 'eq', value]);
  }

  gt(value: unknown): AbstractQuery {
    return new AbstractQuery([this.name, 'gt', value]);
  }

  gte(value: unknown): AbstractQuery {
    return new AbstractQuery([this.name, 'gte', value]);
  }

  in(values: unknown[]): AbstractQuery {
    return new AbstractQuery([this.name, 'in', values]);
  }

  lt(value: unknown): AbstractQuery {
    return new AbstractQuery([this.name, 'lt', value]);
  }

  lte(value: unknown): AbstractQuery {
    return new AbstractQuery([this.name, 'lte', value]);
  }

  ne(value: unknown): AbstractQuery {
    return new AbstractQuery([this.name, 'ne', value]);
  }

  nin(values: unknown[]): AbstractQuery {
    return new AbstractQuery([this.name, 'nin', values]);
  }

  exists(exists = true): AbstractQuery {
    return new AbstractQuery([this.name, 'exists', exists]);
  }
}

export const qField = (name: string): Operation => new Operation(name);

export const qSerialize = AbstractQuery.serialize;

export type QueryType = AbstractQuery | SerializedQuery;

export default SerializedQuery;
