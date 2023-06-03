import "dotenv/config";
import "./validate-process-env";
import { type CompiledQuery } from "kysely";
import { serialize } from "superjson";
import Fastify from "fastify";
import { fcm } from "./firebase-cloud-messaging";
import { db, parseCompiledQuery } from "./db";
import { errorMessage } from "./utils";

/*
notes to self:
- for consistency: ONLY USE ASYNC handlers/hooks (the sync handlers use different syntax)

- for async handlers we either 
    1. return an object or
    2. throw an errorMessage()

- returned object only sets response body, to set other things, use the reply methods like reply.status(201) etc

- for order of execution of hooks https://www.fastify.io/docs/latest/Reference/Lifecycle/ 
    do auth as soon as possible, eg in onRequest hook which is the first one, before body is even parsed
*/

const DEBUG_EXPLAIN_ANALYZE_GET_QUERYS = true;

const server = Fastify();

server.addHook("onRequest", async (request) => {
  if (request.headers.authorization !== process.env.AUTH_SECRET) {
    throw errorMessage("UNAUTHORIZED");
  }
});

///////////////////////////////
// Database queries (kysely) //
///////////////////////////////

server.route<{ Querystring: { q: string } }>({
  method: "GET",
  url: "/",
  handler: async (request, _reply) => {
    const compiledQuery = parseCompiledQuery(request.query.q);
    if (!compiledQuery) throw errorMessage("BAD_REQUEST", "bad query");

    if (DEBUG_EXPLAIN_ANALYZE_GET_QUERYS) {
      await consolelogExplainAnalyzeResult(compiledQuery);
    }

    const result = await db.executeQuery(compiledQuery);
    return serialize(result);
  },
});

server.route({
  method: "POST",
  url: "/",
  handler: async (request, _reply) => {
    const compiledQuery = parseCompiledQuery(request.body);
    if (!compiledQuery) throw errorMessage("BAD_REQUEST", "bad body");

    console.log("POST, compiledQuery:", compiledQuery);

    const result = await db.executeQuery(compiledQuery);
    return serialize(result);
  },
});

//////////////////////////////////////////////
// Notifications (firebase cloud messaging) //
//////////////////////////////////////////////

type NotifyBody = {
  userId: number;
  title: string;
  body: string;
  imageUrl: string;
  linkUrl: string;
};

server.route<{ Body: NotifyBody }>({
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
  handler: async (request, _reply) => {
    try {
      const body = request.body;
      const user = await db
        .selectFrom("User")
        .select("fcmToken")
        .where("id", "=", body.userId)
        .executeTakeFirst();
      if (!user?.fcmToken)
        throw errorMessage("UNAUTHORIZED", "no user.fcmToken");

      const result = await fcm.sendNotification({
        ...body,
        token: user.fcmToken,
      });
      return result;
    } catch (error) {
      throw errorMessage("UNAUTHORIZED");
    }
  },
});

///////////
// debug //
///////////

async function consolelogExplainAnalyzeResult(compiledQuery: CompiledQuery) {
  try {
    //https://dev.mysql.com/doc/refman/8.0/en/explain.html#explain-analyze
    const debugQuery = {
      sql: "EXPLAIN ANALYZE " + compiledQuery.sql,
      parameters: compiledQuery.parameters,
    } as CompiledQuery;
    const explainAnalyzeResult = await db.executeQuery(debugQuery);
    console.log("compiledQuery analyzed:", explainAnalyzeResult);
  } catch (error) {
    console.log("error:", error);
  }
}

//////////////////
// start server //
//////////////////

async function start() {
  try {
    console.log(`listening on port ${process.env.PORT}`);
    await server.listen({ host: "0.0.0.0", port: Number(process.env.PORT) });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

start();
