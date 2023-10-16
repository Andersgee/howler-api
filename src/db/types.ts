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
  image: string | null;
};
export type Eventchatmessage = {
  id: Generated<number>;
  createdAt: Generated<Timestamp>;
  text: string;
  eventId: number;
  userId: number;
};
export type EventLocation = {
  id: Generated<number>;
  lng: number;
  lat: number;
  placeName: string | null;
  eventId: number;
};
export type EventLocationTilePivot = {
  eventLocationId: number;
  tileId: string;
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
export type Tile = {
  id: string;
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
  Eventchatmessage: Eventchatmessage;
  EventLocation: EventLocation;
  EventLocationTilePivot: EventLocationTilePivot;
  Example: Example;
  FcmToken: FcmToken;
  Notification: Notification;
  Tile: Tile;
  User: User;
  UserEventPivot: UserEventPivot;
  UserNotificationPivot: UserNotificationPivot;
  UserUserPivot: UserUserPivot;
};
