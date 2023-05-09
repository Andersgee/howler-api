import "dotenv/config";
import { type CompiledQuery, Kysely, MysqlDialect } from "kysely";
import { createPool } from "mysql2";
import { serialize, deserialize } from "superjson";
import Fastify from "fastify";
import { type SuperJSONResult } from "superjson/dist/types";

if (!process.env.DATABASE_URL) throw new Error("no DATABASE_URL in env");
if (!process.env.API_PORT) throw new Error("no API_PORT in env");

//cant pass connection url to createPool for some reason? so split it
const [, , , user, password, host, port, database] =
  process.env.DATABASE_URL.split(/:|\/|@/);

const AUTH_SECRET = `Basic ${password}`;
const PORT = process.env.API_PORT;

const kysely = new Kysely({
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

const fastify = Fastify();

fastify.route({
  method: "GET",
  url: "/",
  handler: async (request, reply) => {
    reply.send({ message: "ok" });
  },
});

fastify.route({
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
    ) as CompiledQuery<unknown>;
    const result = await kysely.executeQuery(compiledQuery);
    reply.send(serialize(result));
  },
});

const start = async () => {
  try {
    console.log(`listening on port ${PORT}`);
    await fastify.listen({ host: "0.0.0.0", port: Number(PORT) });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();
