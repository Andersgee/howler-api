import "dotenv/config";
import "./validate-process-env";
import { type CompiledQuery, Kysely, MysqlDialect } from "kysely";
import { createPool } from "mysql2";
import { serialize, deserialize } from "superjson";
import Fastify from "fastify";
import { type SuperJSONResult } from "superjson/dist/types";
import {
  type Notification,
  FirebaseCloudMessaging,
} from "./firebase-cloud-messaging";
import type { DB } from "./db-types";

//cant pass connection url to createPool for some reason? so split it
const [, , , user, password, host, port, database] =
  process.env.DATABASE_URL.split(/:|\/|@/);

const AUTH_SECRET = `Basic ${password}`;
const PORT = process.env.API_PORT;

const DEBUG_EXPLAIN_ANALYZE_GET_QUERYS = true;

const kysely = new Kysely<DB>({
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

const fcm = new FirebaseCloudMessaging();

const server = Fastify();

/**
 * example usage: `throw errorbody(401, "some message")`
 *
 * for async functions there is only 2 options:
 * - return an object, for example: { hello: "world" }
 * - throw an object that looks like this: { statusCode, message };
 *
 * use methods on the `reply` param to set other things that is not simply the payload, like reply.code(201) for example
 */
function errorMessage(statusCode: number, message?: string) {
  return { statusCode, message: message || "no info" };
}

function parseCompiledQuery(body: unknown) {
  try {
    if (typeof body === "string") {
      return deserialize(JSON.parse(body) as SuperJSONResult) as CompiledQuery;
    }
    return deserialize(body as SuperJSONResult) as CompiledQuery;
  } catch (error) {
    console.error(error);
    return null;
  }
}

//https://www.fastify.io/docs/latest/Reference/Lifecycle/ for order of execution of hooks
server.addHook("onRequest", async (request) => {
  if (request.headers.authorization !== AUTH_SECRET) {
    throw errorMessage(401, "Unauthorized");
  }
});

server.route<{ Querystring: { q: string } }>({
  method: "GET",
  url: "/",
  handler: async (request, reply) => {
    const compiledQuery = parseCompiledQuery(request.query.q);
    if (!compiledQuery) throw errorMessage(400, "Bad query");

    //reply.status(201);

    console.log("GET, compiledQuery:", compiledQuery);
    if (DEBUG_EXPLAIN_ANALYZE_GET_QUERYS) {
      try {
        //https://dev.mysql.com/doc/refman/8.0/en/explain.html#explain-analyze
        const debugQuery = {
          sql: "EXPLAIN ANALYZE " + compiledQuery.sql,
          parameters: compiledQuery.parameters,
        } as CompiledQuery;
        //console.log("debugQuery:", debugQuery);
        const explainAnalyzeResult = await kysely.executeQuery(debugQuery);
        console.log("compiledQuery analyzed:", explainAnalyzeResult);
      } catch (error) {
        console.log("catch... could not explain analyze that thing...");
        //console.log("error:", error);
      }
    }

    const result = await kysely.executeQuery(compiledQuery);
    return serialize(result);
  },
});

server.route({
  method: "POST",
  url: "/",
  handler: async (request, reply) => {
    const compiledQuery = parseCompiledQuery(request.body);
    if (!compiledQuery) throw errorMessage(400, "Bad body");

    console.log("POST, compiledQuery:", compiledQuery);

    const result = await kysely.executeQuery(compiledQuery);
    return serialize(result);
  },
});

///////////////////////////////////////

server.route<{
  Body: {
    userId: number;
    title: string;
    body: string;
    imageUrl: string;
    linkUrl: string;
  };
}>({
  method: "POST",
  url: "/notify",
  schema: {
    body: {
      type: "object",
      required: ["userId", "title", "body", "imageUrl", "linkUrl"],
      properties: {
        userId: { type: "number" },
        title: { type: "string" },
        body: { type: "string" },
        imageUrl: { type: "string" },
        linkUrl: { type: "string" },
      },
    },
  },
  handler: async (request, reply) => {
    try {
      const body = request.body;
      const user = await kysely
        .selectFrom("User")
        .select("fcmToken")
        .where("id", "=", body.userId)
        .executeTakeFirst();
      if (!user?.fcmToken) throw errorMessage(401, "no user.fcmToken");

      const notification: Notification = {
        ...body,
        token: user.fcmToken,
      };
      const result = await fcm.sendNotification(notification);
      return result;
    } catch (error) {
      throw errorMessage(401);
    }
  },
});

const start = async () => {
  try {
    console.log(`listening on port ${PORT}`);
    await server.listen({ host: "0.0.0.0", port: Number(PORT) });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
