# Copilot instructions — gacha-hub

`AGENTS.md` at the repository root is the authoritative instruction file; follow it. Summary:

- Specification: `docs/DESIGN.md`. Workflow: `docs/ENGINEERING.md`. Shared memory: `docs/AGENT_LOG.md` (read the newest entries first; add an entry at the end of every PR).
- Test-driven development: failing test first, then implementation, then refactor.
- Small stacked PRs on plain GitHub (`stack/<topic>/<nn>-<slug>`), Conventional Commits, never push to `main`.
- Stack: TypeScript monorepo on npm workspaces (React + Vite, Fastify, Prisma, zod), ESLint, Prettier, Vitest. Check all: `npm run check`.
- Every game is hardcoded; catalog data only comes from `scripts/catalog`. No dependencies outside `docs/DESIGN.md` §6 without justification; never commit secrets.
