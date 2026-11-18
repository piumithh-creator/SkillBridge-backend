import { z } from "zod";
import { pageQuery } from "./common";

export const notificationsQuery = z.object({
  ...pageQuery,
  unreadOnly: z.enum(["true", "false"]).optional()
});
