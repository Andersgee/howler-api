import Hashids from "hashids";

const hashids = new Hashids(process.env.HASHIDS_SALT, 5);

export function hashidFromId(n: number) {
  return hashids.encode(n);
}

export function idFromHashid(s: string) {
  const decoded = hashids.decode(s);
  return decoded[0] as number | undefined;
}
