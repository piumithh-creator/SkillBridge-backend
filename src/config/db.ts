import mongoose from "mongoose";
import { env } from "./env";

export const connectDB = async (uri: string = env.MONGODB_URI): Promise<void> => {
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri);
  console.log("MongoDB connected");
};

export const disconnectDB = async (): Promise<void> => {
  await mongoose.disconnect();
};
