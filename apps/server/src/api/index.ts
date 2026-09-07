import type { FastifyInstance } from "fastify";
import { registerGameRoutes } from "./games.js";
import { registerCharacterRoutes } from "./characters.js";
import { registerTaskRoutes } from "./tasks.js";
import { registerDashboardRoutes } from "./dashboard.js";
import { registerUploadRoutes } from "./uploads.js";
import { registerReminderRoutes } from "./reminders.js";
import { registerCronRoutes } from "./cron.js";
import { registerDiscordInteractions } from "../discord/interactions.js";

export async function registerApi(app: FastifyInstance) {
  await registerGameRoutes(app);
  await registerCharacterRoutes(app);
  await registerTaskRoutes(app);
  await registerDashboardRoutes(app);
  await registerUploadRoutes(app);
  await registerReminderRoutes(app);
  await registerCronRoutes(app);
  await registerDiscordInteractions(app);
}
