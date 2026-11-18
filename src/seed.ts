import bcrypt from "bcryptjs";
import { connectDB, disconnectDB } from "./config/db";
import { env } from "./config/env";
import { User } from "./models/User";

/** Admins can only be created here (CLI), never through the public API. */
const run = async () => {
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
    throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD in .env before running the seed script");
  }
  if (env.ADMIN_PASSWORD.length < 8) throw new Error("ADMIN_PASSWORD must be at least 8 characters");
  await connectDB();
  const email = env.ADMIN_EMAIL.toLowerCase();
  if (await User.exists({ email })) {
    console.log(`Admin ${email} already exists – nothing to do`);
  } else {
    await User.create({ name: env.ADMIN_NAME, email, password: await bcrypt.hash(env.ADMIN_PASSWORD, 12), role: "ADMIN" });
    console.log(`Admin ${email} created`);
  }
  await disconnectDB();
};

run().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
