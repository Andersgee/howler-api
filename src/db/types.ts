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
export type Example = {
  id: Generated<number>;
  createdAt: Generated<Timestamp>;
  updatedAt: Generated<Timestamp>;
};
export type FcmToken = {
  id: string;
  userId: number;
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
export type UserEventPivot = {
  userId: number;
  eventId: number;
  joinDate: Generated<Timestamp>;
};
export type DB = {
  Event: Event;
  Example: Example;
  FcmToken: FcmToken;
  Place: Place;
  User: User;
  UserEventPivot: UserEventPivot;
};
