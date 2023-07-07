import "dotenv/config";
import "./validate-process-env";
import { type InsertObject, type CompiledQuery } from "kysely";
import Fastify from "fastify";
import { fcm } from "./firebase-cloud-messaging";
import type {
  ChatMessageData,
  NotificationMessageData,
} from "./message-schema";
import { db, parseCompiledQuery } from "./db";
import type { DB } from "./db/types";
import { FIREBASE_MESSAGING_ERROR_CODES, errorMessage } from "./utils";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/mysql";
import cors from "@fastify/cors";
import type { BatchResponse } from "firebase-admin/messaging";
import { hashidFromId } from "./hashid";
import { stringify } from "devalue";

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

async function fcmTokensFromUserIds(userIds: number[]) {
  const fcmTokens = await db
    .selectFrom("FcmToken")
    .select("id")
    .where("userId", "in", userIds)
    .execute();

  return fcmTokens.map((t) => t.id);
}

/*
async function debuginsertdate() {
  const when = new Date();
  const whenEnd = new Date();
  const values = {
    creatorId: 1,
    what: "debugdate",
    where: "debugdate",
    when: when,
    whenEnd: whenEnd,
    who: "debugdate",
    info: "no info",
  };
  console.log("before execute debugdate");
  const insertresult = await db
    .insertInto("Event")
    .values(values)
    .executeTakeFirstOrThrow();
  console.log("after execute debugdate");
  console.log("insertresult", insertresult);
}

await debuginsertdate();
*/

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
      console.log("debug GET:");
      await consolelogExplainAnalyzeResult(compiledQuery);
    }

    const result = await db.executeQuery(compiledQuery);
    return stringify(result);
  },
});

server.route({
  method: "POST",
  url: "/",
  handler: async (request, _reply) => {
    const compiledQuery = parseCompiledQuery(request.body);
    if (!compiledQuery) return errorMessage("CLIENTERROR_BAD_REQUEST");

    if (process.env.DEBUG_EXPLAIN_ANALYZE_QUERYS) {
      console.log("debug POST:");
      await consolelogExplainAnalyzeResult(compiledQuery);
    }

    const result = await db.executeQuery(compiledQuery);
    return stringify(result);
  },
});

//////////////////////////////
// firebase cloud messaging //
//////////////////////////////

server.route<{
  Body: {
    eventId: number;
    userId: number;
    text: string;
  };
}>({
  method: "POST",
  url: "/chat",
  schema: {
    body: {
      type: "object",
      required: ["eventId", "userId", "text"],
      properties: {
        eventId: { type: "number" },
        userId: { type: "number" },
        text: { type: "string" },
      },
    },
  },
  handler: async (request, _reply) => {
    console.log("handling POST /chat");
    try {
      const input = request.body;

      //save to db
      const insertResult = await db
        .insertInto("Eventchatmessage")
        .values({
          eventId: input.eventId,
          userId: input.userId,
          text: input.text,
        })
        .executeTakeFirstOrThrow();
      const insertId = Number(insertResult.insertId);

      //grab saved data
      const eventchatmessage = await db
        .selectFrom("Eventchatmessage")
        .selectAll()
        .where("id", "=", insertId)
        .executeTakeFirstOrThrow();

      //get userIds
      const users = await db
        .selectFrom("UserEventPivot")
        .select("userId")
        .where("eventId", "=", input.eventId)
        .execute();
      const userIds = users.map((user) => user.userId);

      if (userIds.length < 1) {
        //no need to do anything else
        return "ok";
      }

      //push it to users
      const data: ChatMessageData = {
        type: "chat",
        ...eventchatmessage,
      };
      const fcmTokens = await fcmTokensFromUserIds(userIds);
      const batchResponse = await fcm.sendChatmessage(data, fcmTokens);
      await deleteStaleFcmtokens(batchResponse, fcmTokens);

      return "ok";
    } catch (error) {
      console.log("error:", error);
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
    console.log("handling POST /notifyeventcreated");
    try {
      const body = request.body;

      //get event info
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

      const userIds = event.creatorFollowers.map(
        (follower) => follower.followerId
      );

      //save to db
      const insertResult = await db
        .insertInto("Notification")
        .values({
          title: `howl by ${event.creator.name}`,
          body: `what: ${event.what}`,
          linkUrl: `https://howler.andyfx.net/event/${hashidFromId(event.id)}`,
          relativeLinkUrl: `/event/${hashidFromId(event.id)}`,
        })
        .executeTakeFirstOrThrow();
      const insertId = Number(insertResult.insertId);

      if (userIds.length < 1) {
        //no need to do anything else
        return "ok";
      }

      //also link it to users
      await db
        .insertInto("UserNotificationPivot")
        .values(
          userIds.map((userId) => ({
            notificationId: insertId,
            userId,
          }))
        )
        .execute();

      //grab saved data
      const notification = await db
        .selectFrom("Notification")
        .selectAll()
        .where("id", "=", insertId)
        .executeTakeFirstOrThrow();

      //push it to users
      const data: NotificationMessageData = {
        type: "notification",
        ...notification,
      };
      const fcmTokens = await fcmTokensFromUserIds(userIds);
      const batchResponse = await fcm.sendNotifications(data, fcmTokens);
      await deleteStaleFcmtokens(batchResponse, fcmTokens);

      return "ok";
    } catch (error) {
      console.log("error:", error);
      return errorMessage("CLIENTERROR_BAD_REQUEST");
    }
  },
});

///////////
// debug //
///////////

async function consolelogExplainAnalyzeResult(compiledQuery: CompiledQuery) {
  console.log("compiledQuery:", compiledQuery.sql);
  if (
    compiledQuery.sql.startsWith("SHOW") ||
    compiledQuery.sql.startsWith("DESCRIBE")
  ) {
    return;
  }
  try {
    //https://dev.mysql.com/doc/refman/8.0/en/explain.html#explain-analyze
    const debugQuery = {
      //sql: "EXPLAIN ANALYZE " + compiledQuery.sql,
      sql: "EXPLAIN " + compiledQuery.sql,
      parameters: compiledQuery.parameters,
    } as CompiledQuery;
    const explainAnalyzeResult = await db.executeQuery(debugQuery);
    console.log("compiledQuery analyzed:", explainAnalyzeResult);
  } catch (error) {
    console.log("error:", error);
  }
}

async function deleteStaleFcmtokens(
  batchResponse: BatchResponse,
  fcmTokens: string[]
) {
  const BAD_TOKEN_CODES = [
    FIREBASE_MESSAGING_ERROR_CODES.REGISTRATION_TOKEN_NOT_REGISTERED,
    FIREBASE_MESSAGING_ERROR_CODES.INVALID_RECIPIENT,
  ];

  const BAD_FORMATTING_CODES = [
    FIREBASE_MESSAGING_ERROR_CODES.INVALID_ARGUMENT,
    FIREBASE_MESSAGING_ERROR_CODES.INVALID_PAYLOAD,
  ];

  const isStaleTokenList = batchResponse.responses.map((response) => {
    if (response.success) return false;

    const code = response.error?.code;
    if (!code) return false;

    if (BAD_FORMATTING_CODES.includes(code)) {
      console.log(
        `fcm.send() response error (prob issue with the payload we sent, CODE: ${code}), error:`,
        response.error
      );

      return false;
    }

    //delete worthy, invalid or stale
    if (BAD_TOKEN_CODES.includes(code)) return true;

    console.log(
      `fcm.send() response error (didnt check for this explicitly, CODE: ${code}), error:`,
      response.error
    );

    return false;
  });

  const staleFcmTokens = fcmTokens.filter((_, i) => isStaleTokenList[i]);
  for (const fcmToken of staleFcmTokens) {
    const deleteResult = await db
      .deleteFrom("FcmToken")
      .where("id", "=", fcmToken)
      .executeTakeFirst();

    console.log(
      "deleted stale fcmToken, numDeletedRows:",
      deleteResult.numDeletedRows
    );
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
        //see best practises https://firebase.google.com/docs/cloud-messaging/manage-tokens
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
