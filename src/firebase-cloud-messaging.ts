import admin from "firebase-admin";
import { type Messaging, getMessaging } from "firebase-admin/messaging";
import type {
  //BaseMessage,
  //TokenMessage,
  TopicMessage,
  //ConditionMessage,
} from "firebase-admin/messaging";
import {
  type ChatMessageData,
  createDataMessage,
  createNotificatonMessage,
  type NotificationMessageData,
  createChatMessage,
} from "./message-schema";

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

  async sendNotification(
    notification: NotificationMessageData,
    fcmToken: string
  ) {
    const message = createNotificatonMessage(notification, fcmToken);
    return this.messaging.send(message);
  }

  async sendNotifications(data: NotificationMessageData, fcmTokens: string[]) {
    const messages = fcmTokens.map((fcmToken) =>
      createNotificatonMessage(data, fcmToken)
    );
    return this.messaging.sendEach(messages);
  }

  async sendChatmessage(data: ChatMessageData, fcmTokens: string[]) {
    const messages = fcmTokens.map((fcmToken) =>
      createChatMessage(data, fcmToken)
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
