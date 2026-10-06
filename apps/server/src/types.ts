import type { User } from "./generated/prisma/client.js";

// Attach the authenticated user (or null) and admin flag to every request.
declare module "fastify" {
  interface FastifyRequest {
    user: User | null;
    isAdmin: boolean;
  }
}

export type { User };
