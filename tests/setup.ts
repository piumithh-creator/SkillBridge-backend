import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, inject } from "vitest";

process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET = "test-access-secret-0123456789";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-0123456789";
process.env.CLIENT_URL = "http://localhost:5173";
process.env.UPLOAD_DIR = "uploads-test";
process.env.MONGODB_URI = inject("mongoUri");

beforeAll(async () => {
  await mongoose.connect(inject("mongoUri"));
  await Promise.all(Object.values(mongoose.models).map((m) => m.init())); // build unique indexes
});

beforeEach(async () => {
  const collections = await mongoose.connection.db!.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
});

afterAll(async () => {
  await mongoose.disconnect();
});
