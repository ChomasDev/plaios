---
id: database
part: The components
title: The database
tagline: Your own tables, in a namespace nobody else can touch.
kinds: database
---
Every component gets a database. Not a connection string, not a shared pool: a **scoped view** of the installed database provider, named after your instance. Your `searches` table and someone else's `searches` table never meet.

## You already have it

If a database component is installed, every plugin receives `options.database`, already scoped. The namespace is your instance id with `:` replaced by `-`, so `action:web-search` gets `action-web-search`. List `database` under `optional` to say you use it.

```yaml agent-os.package.yaml
    optional: [database]
```

## The contract

```ts @plaios/core/domain
export interface Database {
  readonly namespace: string;
  init(structure: DatabaseStructure): Promise<void>;
  add<T extends DatabaseRecord>(table: string, value: T): Promise<T>;
  get<T extends DatabaseRecord>(table: string, id: DatabaseKey): Promise<T | undefined>;
  get<T extends DatabaseRecord>(table: string, query?: DatabaseQuery): Promise<readonly T[]>;
  set<T extends DatabaseRecord>(table: string, id: DatabaseKey, value: T): Promise<T>;
  update<T extends DatabaseRecord>(table: string, id: DatabaseKey, patch: Partial<T>): Promise<T | undefined>;
  delete(table: string, target: DatabaseKey | DatabaseQuery): Promise<number>;
}

export interface DatabaseQuery {
  where?: Readonly<Record<string, unknown>>;
  orderBy?: readonly { field: string; direction?: "asc" | "desc" }[];
  limit?: number;
  offset?: number;
}

// column types: "string" | "number" | "boolean" | "datetime" | "json"
```

## A real example: keep the last 200 searches

This is the pattern the Perplexity plugin uses for its `WebSources` cards:

```ts src/search-store.ts
const TABLE = "searches";

export class SearchStore {
  private ready?: Promise<void>;
  constructor(private readonly database: Database) {}

  private init() {
    this.ready ??= this.database.init({
      tables: {
        [TABLE]: {
          primaryKey: "id",
          columns: {
            id: { type: "string", required: true },
            query: { type: "string", required: true },
            results: { type: "json", required: true },
            createdAt: { type: "datetime", required: true },
          },
          indexes: [{ columns: ["createdAt"] }],
        },
      },
    });
    return this.ready;
  }

  async save(search: StoredSearch) {
    await this.init();
    await this.database.set(TABLE, search.id, { ...search });
    const stale = await this.database.get<StoredSearch>(TABLE, { orderBy: [{ field: "createdAt", direction: "desc" }], offset: 200 });
    await Promise.all(stale.map((row) => this.database.delete(TABLE, row.id)));
  }

  async find(id: string) {
    await this.init();
    return this.database.get<StoredSearch>(TABLE, id);
  }
}
```

Three habits worth stealing:

- **Init lazily, once**: keep the `init` promise and await it everywhere. It is idempotent, so calling it on every boot is fine.
- **`set` for upserts, `add` for inserts** that must not overwrite.
- **Trim as you write**: a `delete` with a query keeps the table bounded forever.

## Writing a provider

A database component implements `DatabaseProvider`:

```ts @plaios/core/domain
export interface DatabaseProvider {
  scope(namespace: string): Database;
  close?(): Promise<void>;
}
```

The shipped one is SQLite through `node:sqlite`. A Postgres provider is a `scope()` that prefixes table names, or uses one schema per namespace.

> **Tip** Plan for no database. Wrap your store so it falls back to an in-memory `Map` when `options.database` is undefined. Your plugin then still works on a minimal install, just without persistence.
