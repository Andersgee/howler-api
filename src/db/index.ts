import { Kysely, MysqlDialect, type CompiledQuery } from "kysely";
import type { DB } from "./types";
import { createPool } from "mysql2";
import { parse } from "devalue";

//split connection url into individual variables for createPool
const [, , , user, password, host, port, database] =
  process.env.DATABASE_URL.split(/:|\/|@/);

export const db = new Kysely<DB>({
  dialect: new MysqlDialect({
    pool: createPool({
      user,
      password,
      host,
      port: Number(port),
      database,
    }),
  }),
});

export function parseCompiledQuery(body: string | unknown) {
  try {
    if (typeof body === "string") {
      return parse(body) as CompiledQuery;
    }

    console.error("parseCompiledQuery... body was not string, returning null");
    return null;
  } catch (error) {
    console.error(error);
    console.log("actual body that couldnt be parsed, body:", body);
    return null;
  }
}
