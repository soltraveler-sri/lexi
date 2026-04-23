import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "@/lib/db/schema";

type Database = ReturnType<typeof drizzle<typeof schema>>;

let sqlClient: postgres.Sql | null = null;
let db: Database | null = null;

export function getDb(): Database {
  if (db) {
    return db;
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for database access");
  }

  sqlClient = postgres(databaseUrl, { prepare: false });
  db = drizzle(sqlClient, { schema });

  return db;
}
