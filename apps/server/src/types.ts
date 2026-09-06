import type { User } from "@prisma/client";

// Attach the authenticated user (or null) to every request.
declare module "fastify" {
  interface FastifyRequest {
    user: User | null;
  }
}

export type { User };
