import "dotenv/config";
import "./validate-process-env";
import { type CompiledQuery } from "kysely";
import { serialize } from "superjson";
import Fastify from "fastify";
import { fcm, type Notification } from "./firebase-cloud-messaging";
import { db, parseCompiledQuery } from "./db";
import { FIREBASE_MESSAGING_ERROR_CODES, errorMessage } from "./utils";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/mysql";
import cors from "@fastify/cors";
import type { BatchResponse } from "firebase-admin/messaging";
import { hashidFromId } from "./hashid";

/*
notes to self:
for consistency: only use ASYNC handlers/hooks (the sync handlers use different syntax)
- either return errorMessage()
- or just return an object
  - returned object only sets response body, to set other things, use the reply methods like reply.status(201) etc
- for order of execution of hooks https://www.fastify.io/docs/latest/Reference/Lifecycle/ 
    do auth as soon as possible, eg in onRequest hook which is the first one, before body is even parsed
*/

const server = Fastify();
console.log("registering cors");
await server.register(cors, {
  // put your options here
});

server.addHook("onRequest", async (request) => {
  if (request.headers.authorization !== process.env.AUTH_SECRET) {
    return errorMessage("CLIENTERROR_UNAUTHORIZED");
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
    if (!compiledQuery) return errorMessage("CLIENTERROR_BAD_REQUEST");

    if (process.env.DEBUG_EXPLAIN_ANALYZE_QUERYS) {
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
    if (!compiledQuery) return errorMessage("CLIENTERROR_BAD_REQUEST");

    if (process.env.DEBUG_EXPLAIN_ANALYZE_QUERYS) {
      await consolelogExplainAnalyzeResult(compiledQuery);
    }

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
  linkUrl: string;
};

server.route<{ Body: NotifyBody }>({
  method: "POST",
  url: "/notify",
  schema: {
    body: {
      type: "object",
      required: ["userId", "title", "body", "linkUrl"],
      properties: {
        userId: { type: "number" },
        title: { type: "string" },
        body: { type: "string" },
        linkUrl: { type: "string" },
      },
    },
  },
  handler: async (request, _reply) => {
    try {
      const body = request.body;

      const user = await db
        .selectFrom("User")
        .select("User.name")
        .where("User.id", "=", body.userId)
        .select((eb) => [
          jsonArrayFrom(
            eb
              .selectFrom("FcmToken")
              .select("FcmToken.id")
              .whereRef("FcmToken.userId", "=", "User.id")
          ).as("fcmTokens"),
        ])
        .executeTakeFirst();

      if (!user) return errorMessage("CLIENTERROR_BAD_REQUEST", "no user");
      if (user.fcmTokens.length < 1) {
        return errorMessage(
          "CLIENTERROR_CONFLICT",
          `userId: ${body.userId} has no fcmTokens to send to`
        );
      }

      const notifications: Notification[] = user.fcmTokens.map((fcmToken) => ({
        ...body,
        imageUrl: undefined, //may or may not send an extra image in notification
        token: fcmToken.id,
      }));
      const batchResponse = await fcm.sendNotifications(notifications);
      consolelogBatchresponseResult(batchResponse);

      return { message: batchResponse };
    } catch (error) {
      return errorMessage("CLIENTERROR_BAD_REQUEST");
    }
  },
});

server.route<{
  Body: {
    eventId: number;
  };
}>({
  method: "POST",
  url: "/notifyeventcreated",
  schema: {
    body: {
      type: "object",
      required: ["eventId"],
      properties: {
        eventId: { type: "number" },
      },
    },
  },
  handler: async (request, _reply) => {
    try {
      const body = request.body;

      const event = await db
        .selectFrom("Event")
        .selectAll("Event")
        .where("Event.id", "=", body.eventId)
        .select((b) => [
          jsonObjectFrom(
            b
              .selectFrom("User")
              .select(["User.id", "User.name"])
              .whereRef("User.id", "=", "Event.creatorId")
          ).as("creator"),
          jsonArrayFrom(
            b
              .selectFrom("UserUserPivot")
              .select("followerId")
              .whereRef("UserUserPivot.userId", "=", "Event.creatorId")
          ).as("creatorFollowers"),
        ])
        .executeTakeFirstOrThrow();

      const followerIds = event.creatorFollowers.map(
        (follower) => follower.followerId
      );

      const followersFcmTokens = await db
        .selectFrom("FcmToken")
        .selectAll()
        .where("FcmToken.userId", "in", followerIds)
        .execute();

      const notifications: Notification[] = followersFcmTokens.map(
        (fcmToken) => ({
          title: `howl by ${event.creator.name}`,
          body: `what: ${event.what}`,
          linkUrl: `https://howler.andyfx.net/event/${hashidFromId(event.id)}`,
          imageUrl: undefined, //may or may not send an extra image in notification
          token: fcmToken.id,
        })
      );
      const batchResponse = await fcm.sendNotifications(notifications);
      consolelogBatchresponseResult(batchResponse);
    } catch (error) {
      return errorMessage("CLIENTERROR_BAD_REQUEST");
    }
  },
});

///////////
// debug //
///////////

async function consolelogExplainAnalyzeResult(compiledQuery: CompiledQuery) {
  console.log("compiledQuery:", compiledQuery.sql);
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

function consolelogBatchresponseResult(batchResponse: BatchResponse) {
  for (const response of batchResponse.responses) {
    if (!response.success) {
      const code = response.error?.code; //guaranteed to exist when response.success is false
      if (!code) {
        console.log("fcm.send() response error (no code)");
        continue;
      }
      if (
        [
          FIREBASE_MESSAGING_ERROR_CODES.INVALID_ARGUMENT,
          FIREBASE_MESSAGING_ERROR_CODES.INVALID_PAYLOAD,
        ].includes(code)
      ) {
        console.log(
          "fcm.send() response error (there is prob an issue with the payload we sent), error:",
          response.error
        );
      } else if (
        [
          FIREBASE_MESSAGING_ERROR_CODES.REGISTRATION_TOKEN_NOT_REGISTERED,
          FIREBASE_MESSAGING_ERROR_CODES.INVALID_RECIPIENT,
        ].includes(code)
      ) {
        console.log(
          "fcm.send() response error (fcmToken is probably stale, should remove it from db). error:",
          response.error
        );
        //TODO: remove any stale/invalid tokens
      } else {
        console.log(
          "fcm.send() response error (I didnt check for this error explicitly). error:",
          response.error
        );
      }
    }
  }
}

//////////////////
// start server //
//////////////////

async function start() {
  try {
    console.log(`listening on port ${process.env.API_PORT}`);
    await server.listen({
      host: "0.0.0.0",
      port: Number(process.env.API_PORT),
    });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

start();
