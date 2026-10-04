-- Supabase exposes the public schema through its REST API to anyone holding the
-- project's anon key. This app reaches Postgres only through Prisma, as the
-- tables' owner, which bypasses RLS — so enabling RLS with no policies closes the
-- REST path without affecting the app. Any NEW table needs the same line.
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GameInstance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GearPiece" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Team" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CurrencyState" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Character" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Ownership" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MaterialStock" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Task" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ReminderRule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ReminderLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Banner" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Event" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
