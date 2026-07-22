interface DatabaseResult<T = unknown> {
  results: T[];
  success: boolean;
  meta: Record<string, unknown>;
  error?: string;
}

interface DatabasePreparedStatement {
  bind(...values: unknown[]): DatabasePreparedStatement;
  first<T = Record<string, unknown>>(columnName?: string): Promise<T | null>;
  run<T = Record<string, unknown>>(): Promise<DatabaseResult<T>>;
  all<T = Record<string, unknown>>(): Promise<DatabaseResult<T>>;
  raw<T = unknown[]>(options?: { columnNames?: boolean }): Promise<T[]>;
}

interface Database {
  prepare(query: string): DatabasePreparedStatement;
  batch<T = Record<string, unknown>>(statements: DatabasePreparedStatement[]): Promise<DatabaseResult<T>[]>;
  exec(query: string): Promise<{ count: number; duration: number }>;
}
