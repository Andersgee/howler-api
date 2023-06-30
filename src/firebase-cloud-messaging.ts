import admin from "firebase-admin";
import { type Messaging, getMessaging } from "firebase-admin/messaging";
import type {
  //BaseMessage,
  TokenMessage,
  TopicMessage,
  //ConditionMessage,
} from "firebase-admin/messaging";

export type NotificationData = {
  fcmToken: string;
  title: string;
  body: string;
  //imageUrl?: string;
  linkUrl: string;
  relativeLinkUrl: string;
};

/**  simpler wrapper for interacting with Firebase cloud messaging service */
class FirebaseCloudMessaging {
  app: admin.app.App;
  messaging: Messaging;
  constructor() {
    this.app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.HOWLER_FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.HOWLER_FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey:
          process.env.HOWLER_FIREBASE_ADMIN_SERVICE_ACCOUNT_PRIVATE_KEY,
      }),
    });

    this.messaging = getMessaging(this.app);
  }

  async sendNotification(notification: NotificationData) {
    const message = createTokenMessage(notification, notification.fcmToken);
    return this.messaging.send(message);
  }

  async sendNotifications(notifications: NotificationData[]) {
    const messages = notifications.map((notification) =>
      createTokenMessage(notification, notification.fcmToken)
    );
    return this.messaging.sendEach(messages);
  }

  async subscribeToTopic(tokenOrTokens: string | string[], topic: string) {
    return this.messaging.subscribeToTopic(tokenOrTokens, topic);
  }

  async unsubscribeFromTopic(tokenOrTokens: string | string[], topic: string) {
    return this.messaging.unsubscribeFromTopic(tokenOrTokens, topic);
  }

  async sendTopicNotification(message: TopicMessage) {
    return this.messaging.send(message);
  }
}

export const fcm = new FirebaseCloudMessaging();

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
function createTokenMessage(message: NotificationData, fcmToken: string) {
  const payload: TokenMessage = {
    token: fcmToken,
    notification: {
      title: message.title,
      body: message.body,
      //imageUrl: message.imageUrl,
    },
    webpush: {
      notification: {
        icon: "/icons/favicon-48x48.png",
      },
      //headers: message.imageUrl ? { image: message.imageUrl } : undefined,
      fcmOptions: {
        link: message.linkUrl,
      },
    },
    data: message, //
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
  return payload;
}
