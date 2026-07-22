import { drizzle } from "drizzle-orm/libsql";
import { getLibsqlClient } from "../app/api/_lib/runtime";
import * as schema from "./schema";

export function getDb() {
  return drizzle(getLibsqlClient(), { schema });
}
