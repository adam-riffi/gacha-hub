import type { User } from "@prisma/client";

// Attach the authenticated user (or null) and admin flag to every request.
declare module "fastify" {
  interface FastifyRequest {
    user: User | null;
    isAdmin: boolean;
  }
}

export type { User };
