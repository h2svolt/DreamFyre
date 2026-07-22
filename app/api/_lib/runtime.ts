import "server-only";
import { createClient, type Client, type InValue, type ResultSet } from "@libsql/client";

type RuntimeEnvironment = {
  DB: Database;
  ADMIN_EMAILS?: string;
  GAME_CREDENTIAL_ENCRYPTION_KEY?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  AUTH_PREVIEW_OTP?: string;
};

function databaseConfig() {
  const configuredUrl = process.env.TURSO_DATABASE_URL?.trim();
  const url = configuredUrl || (process.env.NODE_ENV === "development" ? "file:./dreamfyre-local.db" : "");
  if (!url) {
    throw new Error("TURSO_DATABASE_URL is not configured. Add it in Vercel Project Settings → Environment Variables.");
  }

  const authToken = process.env.TURSO_AUTH_TOKEN?.trim();
  if (!url.startsWith("file:") && !authToken) {
    throw new Error("TURSO_AUTH_TOKEN is not configured for the remote database.");
  }
  return { url, authToken };
}

let cachedClient: Client | null = null;
let cachedDatabase: Database | null = null;
let cachedFingerprint = "";

function normalizeValue(value: unknown): InValue {
  if (value === undefined) return null;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "bigint" ||
    typeof value === "boolean" ||
    value instanceof Uint8Array ||
    value instanceof Date
  ) {
    return value;
  }
  throw new TypeError(`Unsupported database parameter type: ${typeof value}`);
}

function toDatabaseResult<T>(result: ResultSet): DatabaseResult<T> {
  return {
    results: result.rows as T[],
    success: true,
    meta: {
      changes: result.rowsAffected,
      last_row_id: result.lastInsertRowid?.toString(),
    },
  };
}

class LibsqlPreparedStatement implements DatabasePreparedStatement {
  constructor(
    private readonly client: Client,
    readonly query: string,
    readonly values: InValue[] = [],
  ) {}

  bind(...values: unknown[]): DatabasePreparedStatement {
    return new LibsqlPreparedStatement(this.client, this.query, values.map(normalizeValue));
  }

  async first<T = Record<string, unknown>>(columnName?: string): Promise<T | null> {
    const result = await this.client.execute({ sql: this.query, args: this.values });
    const row = result.rows[0];
    if (!row) return null;
    return (columnName ? row[columnName] : row) as T;
  }

  async run<T = Record<string, unknown>>(): Promise<DatabaseResult<T>> {
    return toDatabaseResult<T>(await this.client.execute({ sql: this.query, args: this.values }));
  }

  async all<T = Record<string, unknown>>(): Promise<DatabaseResult<T>> {
    return toDatabaseResult<T>(await this.client.execute({ sql: this.query, args: this.values }));
  }

  async raw<T = unknown[]>(options?: { columnNames?: boolean }): Promise<T[]> {
    const result = await this.client.execute({ sql: this.query, args: this.values });
    const rows = result.rows.map((row) => result.columns.map((column) => row[column]));
    return (options?.columnNames ? [result.columns, ...rows] : rows) as T[];
  }
}

class LibsqlDatabaseAdapter implements Database {
  constructor(private readonly client: Client) {}

  prepare(query: string): DatabasePreparedStatement {
    return new LibsqlPreparedStatement(this.client, query);
  }

  async batch<T = Record<string, unknown>>(statements: DatabasePreparedStatement[]): Promise<DatabaseResult<T>[]> {
    const prepared = statements.map((statement) => {
      if (!(statement instanceof LibsqlPreparedStatement)) {
        throw new TypeError("Database batch received an incompatible prepared statement.");
      }
      return { sql: statement.query, args: statement.values };
    });
    const results = await this.client.batch(prepared, "write");
    return results.map((result) => toDatabaseResult<T>(result));
  }

  async exec(query: string): Promise<{ count: number; duration: number }> {
    const started = performance.now();
    await this.client.executeMultiple(query);
    return { count: 0, duration: performance.now() - started };
  }
}

export function getLibsqlClient(): Client {
  const config = databaseConfig();
  const fingerprint = `${config.url}|${config.authToken ?? ""}`;
  if (!cachedClient || fingerprint !== cachedFingerprint) {
    cachedClient = createClient(config);
    cachedDatabase = new LibsqlDatabaseAdapter(cachedClient);
    cachedFingerprint = fingerprint;
  }
  return cachedClient;
}

export function getDatabase(): Database {
  getLibsqlClient();
  if (!cachedDatabase) throw new Error("Database initialization failed.");
  return cachedDatabase;
}

export async function getRuntimeEnv(): Promise<RuntimeEnvironment> {
  return {
    DB: getDatabase(),
    ADMIN_EMAILS: process.env.ADMIN_EMAILS,
    GAME_CREDENTIAL_ENCRYPTION_KEY: process.env.GAME_CREDENTIAL_ENCRYPTION_KEY,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
    AUTH_PREVIEW_OTP: process.env.AUTH_PREVIEW_OTP,
  };
}
