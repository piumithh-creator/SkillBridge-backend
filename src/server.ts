import app from "./app";
import { connectDB } from "./config/db";
import { env } from "./config/env";

const start = async () => {
  await connectDB();
  app.listen(env.PORT, () => console.log(`SkillBridge API listening on port ${env.PORT} (${env.NODE_ENV})`));
};

start().catch((err) => {
  console.error("Failed to start server", err);
  process.exit(1);
});
