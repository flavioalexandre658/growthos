import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

let _db: NeonHttpDatabase<typeof schema> | null = null;

export const db = new Proxy({} as NeonHttpDatabase<typeof schema>, {
  get(_target, prop, receiver) {
    if (!_db) {
      const sql = neon(process.env.DATABASE_URL!);
      _db = drizzle(sql, { schema });
    }
    return Reflect.get(_db, prop, receiver);
  },
});
