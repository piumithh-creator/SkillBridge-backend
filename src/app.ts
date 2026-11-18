import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env";
import { errorHandler, notFound } from "./middleware/errorHandler";
import { globalLimiter } from "./middleware/rateLimit";
import { imageDir } from "./middleware/upload";
import routes from "./routes";
import { AppError } from "./utils/AppError";

const app = express();

if (env.isProd) app.set("trust proxy", 1); // Render sits behind a proxy – needed for rate limiting + secure cookies

app.use(
  helmet({
    // Images/logos are loaded by the frontend from a different origin
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || env.clientOrigins.includes(origin)) return cb(null, true);
      cb(AppError.forbidden("Origin not allowed by CORS"));
    },
    credentials: true
  })
);
app.use(globalLimiter);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

// Only profile images / logos are public. CVs are never served statically.
app.use("/uploads/images", express.static(imageDir, { maxAge: "7d", index: false }));

app.get("/api/health", (_req, res) => {
  res.json({ success: true, message: "SkillBridge API is running", data: { uptime: process.uptime() } });
});

app.use("/api", routes);
app.use(notFound);
app.use(errorHandler);

export default app;
