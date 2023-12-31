import { z } from "zod";
import type { TokenMessage } from "firebase-admin/messaging";
import { stringify } from "devalue";
import { hashidFromId } from "./hashid";

export const notificationDataSchema = z.object({
  type: z.literal("notification"),
  id: z.number(),
  title: z.string(),
  body: z.string(),
  imageUrl: z.string().nullable(),
  linkUrl: z.string(),
  relativeLinkUrl: z.string(),
});

export type NotificationMessageData = z.infer<typeof notificationDataSchema>;

export const chatDataSchema = z.object({
  type: z.literal("chat"),
  title: z.string(),
  id: z.number(),
  createdAt: z.date(),
  text: z.string(),
  eventId: z.number(),
  userId: z.number(),
});

export type ChatMessageData = z.infer<typeof chatDataSchema>;

export type FcmMessageData = NotificationMessageData | ChatMessageData;

/**
 * some examples of what all the keys in a Message does:
 * https://firebase.google.com/docs/cloud-messaging/send-message#example-notification-message-with-platform-specific-delivery-options
 * note: icon and image is not the same thing
 *
 * reference here: https://firebase.google.com/docs/reference/fcm/rest/v1/projects.messages
 *
 * "link" options: https://firebase.google.com/docs/cloud-messaging/js/topic-messaging#setting_notification_options_in_the_send_request
 *
 * TLDR;
 *  - only `notification.title` and `notification.body` is considered platform independent
 *  - everything else like `android`, `apns` and `webpush` config objects configures how firebase messaging service adjusts the message before sending it depending on device.
 *  - if only sending data, then its not a notification, its just a regular web push
 */
export function createNotificatonMessage(
  data: NotificationMessageData,
  fcmToken: string
) {
  const payload: TokenMessage = {
    token: fcmToken,
    notification: {
      title: data.title,
      body: data.body,
      //imageUrl: message.imageUrl,
    },
    webpush: {
      notification: {
        icon: "https://howler.andyfx.net/icons/favicon-48x48.png",
      },
      //headers: data.imageUrl ? { image: data.imageUrl } : undefined,
      fcmOptions: {
        link: data.linkUrl,
      },
    },
    data: { str: stringify(data) }, //
    /*
    android: {
      notification: {
        imageUrl: message.imageUrl,
        clickAction: "OPEN_ACTIVITY_1",
      },
      //fcmOptions: {},
    },
    //apns reference: https://firebase.google.com/docs/reference/fcm/rest/v1/projects.messages#apnsconfig
    apns: {
      //payload reference: https://developer.apple.com/documentation/usernotifications/setting_up_a_remote_notification_server/generating_a_remote_notification
      payload: {
        aps: {
          mutableContent: true,
          category: "NEW_MESSAGE_CATEGORY",
        },
      },
      fcmOptions: {
        imageUrl: message.imageUrl,
      },
    },
*/
  };

  if (data.imageUrl && payload.webpush) {
    payload.webpush.headers = { image: data.imageUrl };
  }

  return payload;
}

export function createChatMessage(data: ChatMessageData, fcmToken: string) {
  const payload: TokenMessage = {
    token: fcmToken,
    notification: {
      title: data.title,
      body: data.text,
      //imageUrl: message.imageUrl,
    },
    webpush: {
      notification: {
        icon: "https://howler.andyfx.net/icons/favicon-48x48.png",
      },
      //headers: data.imageUrl ? { image: data.imageUrl } : undefined,
      fcmOptions: {
        link: `https://howler.andyfx.net/event/${hashidFromId(
          data.eventId
        )}/chat`,
      },
    },
    android: { collapseKey: `howler-chat-${data.eventId}` },
    data: { str: stringify(data) },
  };
  return payload;
}
/*
export function createDataMessage(data: ChatMessageData, fcmToken: string) {
  const payload: TokenMessage = {
    token: fcmToken,
    data: { str: stringify(data) },
  };
  return payload;
}
*/
