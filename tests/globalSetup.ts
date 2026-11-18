import { MongoMemoryServer } from "mongodb-memory-server";

let mongod: MongoMemoryServer | undefined;

declare module "vitest" {
  export interface ProvidedContext {
    mongoUri: string;
  }
}

/** Starts ONE database for the whole run (instead of one per test file). */
export default async function setup({ provide }: { provide: (key: "mongoUri", value: string) => void }) {
  let uri = process.env.TEST_MONGODB_URI;
  if (!uri) {
    mongod = await MongoMemoryServer.create();
    uri = mongod.getUri();
  }
  provide("mongoUri", uri);
  return async () => { await mongod?.stop(); };
}
