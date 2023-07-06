import type { ColumnType } from "kysely";

export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>;
export type Timestamp = ColumnType<Date, Date | string, Date | string>;
export type Event = {
  id: Generated<number>;
  creatorId: number;
  what: string;
  where: string;
  when: Timestamp;
  whenEnd: Timestamp;
  who: string;
  info: string;
  placeId: number | null;
};
export type Eventchat = {
  id: number;
};
export type Eventchatmessage = {
  id: Generated<number>;
  createdAt: Generated<Timestamp>;
  text: string;
  eventchatId: number;
  userId: number;
};
export type Example = {
  id: Generated<number>;
  createdAt: Generated<Timestamp>;
  updatedAt: Generated<Timestamp>;
};
export type FcmToken = {
  id: string;
  createdAt: Generated<Timestamp>;
  userId: number;
};
export type Notification = {
  id: Generated<number>;
  title: string;
  body: string;
  imageUrl: string | null;
  linkUrl: string;
  relativeLinkUrl: string;
};
export type Place = {
  id: Generated<number>;
  label: string;
  lng: number;
  lat: number;
};
export type User = {
  id: Generated<number>;
  email: string;
  googleUserSub: string | null;
  discordUserId: string | null;
  githubUserId: number | null;
  image: string | null;
  name: string;
};
export type UserEventchatPivot = {
  userId: number;
  eventchatId: number;
};
export type UserEventPivot = {
  userId: number;
  eventId: number;
  joinDate: Generated<Timestamp>;
};
export type UserNotificationPivot = {
  userId: number;
  notificationId: number;
};
export type UserUserPivot = {
  userId: number;
  followerId: number;
};
export type DB = {
  Event: Event;
  Eventchat: Eventchat;
  Eventchatmessage: Eventchatmessage;
  Example: Example;
  FcmToken: FcmToken;
  Notification: Notification;
  Place: Place;
  User: User;
  UserEventchatPivot: UserEventchatPivot;
  UserEventPivot: UserEventPivot;
  UserNotificationPivot: UserNotificationPivot;
  UserUserPivot: UserUserPivot;
};
