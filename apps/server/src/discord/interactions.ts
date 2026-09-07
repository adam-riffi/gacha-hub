import type { FastifyInstance } from "fastify";
import {
  InteractionResponseFlags,
  InteractionResponseType,
  InteractionType,
  verifyKey,
} from "discord-interactions";
import { config, hasDiscordInteractions } from "../config.js";
import { handleCommand, type CommandOptions } from "./commands.js";

/**
 * Discord HTTP Interactions endpoint. Discord POSTs slash commands here (no
 * gateway connection needed — serverless-friendly). Every request must carry
 * a valid Ed25519 signature over `timestamp + rawBody`.
 */
export async function verifyDiscordSignature(
  rawBody: string,
  signature: string | undefined,
  timestamp: string | undefined,
  publicKeyHex: string,
): Promise<boolean> {
  if (!signature || !timestamp || !publicKeyHex) return false;
  try {
    return await verifyKey(rawBody, signature, timestamp, publicKeyHex);
  } catch {
    return false;
  }
}

interface InteractionPayload {
  type: number;
  data?: {
    name?: string;
    options?: { name: string; type: number; value: string | number }[];
  };
  member?: { user?: { id: string } };
  user?: { id: string };
}

function normalizeOptions(payload: InteractionPayload): CommandOptions {
  const out: CommandOptions = {};
  for (const o of payload.data?.options ?? []) out[o.name] = o.value;
  return out;
}

export async function registerDiscordInteractions(app: FastifyInstance) {
  if (!hasDiscordInteractions()) return;

  // Scoped plugin so we can keep the raw JSON body for signature checks
  // without changing the parser for the rest of the app.
  await app.register(async (scope) => {
    scope.addContentTypeParser(
      "application/json",
      { parseAs: "string" },
      (_req, body, done) => {
        try {
          const raw = body as string;
          done(null, { raw, json: JSON.parse(raw) as InteractionPayload });
        } catch (err) {
          done(err as Error, undefined);
        }
      },
    );

    scope.post("/api/discord/interactions", async (req, reply) => {
      const { raw, json } = req.body as { raw: string; json: InteractionPayload };
      const sig = req.headers["x-signature-ed25519"];
      const ts = req.headers["x-signature-timestamp"];
      const ok = await verifyDiscordSignature(
        raw,
        typeof sig === "string" ? sig : undefined,
        typeof ts === "string" ? ts : undefined,
        config.discord.publicKey,
      );
      if (!ok) return reply.code(401).send({ error: "bad_signature" });

      if (json.type === InteractionType.PING) {
        return { type: InteractionResponseType.PONG };
      }

      if (json.type === InteractionType.APPLICATION_COMMAND) {
        const discordUserId = json.member?.user?.id ?? json.user?.id;
        const name = json.data?.name ?? "";
        const content = discordUserId
          ? await handleCommand(name, normalizeOptions(json), discordUserId)
          : "Could not identify you.";
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content, flags: InteractionResponseFlags.EPHEMERAL },
        };
      }

      return reply.code(400).send({ error: "unsupported_interaction" });
    });
  });
}
