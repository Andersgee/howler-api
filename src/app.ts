import "dotenv/config";
import "./validate-process-env";
import { type CompiledQuery, Kysely, MysqlDialect } from "kysely";
import { createPool } from "mysql2";
import { serialize, deserialize } from "superjson";
import Fastify, { type FastifyRequest } from "fastify";
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

//options: https://github.com/fastify/fastify/blob/main/docs/Reference/Server.md#maxparamlength
const server = Fastify();

type RequestWithQ = FastifyRequest<{
  Querystring: { q: string };
}>;

server.route({
  method: "GET",
  url: "/",
  preHandler: async (request: RequestWithQ, reply) => {
    if (request.headers.authorization !== AUTH_SECRET) {
      reply.code(401).send("Unauthorized");
    }
  },
  handler: async (request: RequestWithQ, reply) => {
    const compiledQuery = deserialize(
      JSON.parse(request.query.q) as SuperJSONResult
    ) as CompiledQuery;

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
    reply.send(serialize(result));
  },
});

server.route({
  method: "POST",
  url: "/",
  preHandler: async (request, reply) => {
    if (request.headers.authorization !== AUTH_SECRET) {
      reply.code(401).send("Unauthorized");
    }
  },
  handler: async (request, reply) => {
    const compiledQuery = deserialize(
      request.body as SuperJSONResult
    ) as CompiledQuery;

    console.log("POST, compiledQuery:", compiledQuery);

    const result = await kysely.executeQuery(compiledQuery);
    reply.send(serialize(result));
  },
});

///////////////////////////////////////

type NotifyRequestBody = {
  userId: number;
  title: string;
  body: string;
  imageUrl: string;
  linkUrl: string;
};

server.post<{ Body: NotifyRequestBody }>(
  "/notify",
  {
    onRequest: async (request, reply) => {
      if (request.headers.authorization !== AUTH_SECRET) {
        return reply.code(401).send("Unauthorized");
      }
    },
    //https://json-schema.org/ fastify is optimized to work with this
    //also see https://www.fastify.io/docs/latest/Reference/Lifecycle/ for order of execution of these "hooks"
    //         https://www.fastify.io/docs/latest/Reference/TypeScript/#hooks
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
  },
  async (request, reply) => {
    try {
      const body = request.body;
      const user = await kysely
        .selectFrom("User")
        .select("fcmToken")
        .where("id", "=", body.userId)
        .executeTakeFirst();
      if (!user?.fcmToken) {
        return reply.code(401).send({ message: "no user.fcmToken" });
      }

      const notification: Notification = {
        ...body,
        token: user.fcmToken,
      };
      const result = await fcm.sendNotification(notification);
      reply.send(result);
    } catch (error) {
      reply.code(401).send({ message: "not ok" });
    }
  }
);

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
