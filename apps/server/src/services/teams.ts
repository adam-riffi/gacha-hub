import { createTeamInput, teamDto, updateTeamInput, type TeamDto } from "@gacha/shared";
import { prisma } from "../lib/prisma.js";
import { gameOrThrow, getCatalog, type PrismaJson } from "../api/util.js";
import { DomainError } from "./domainError.js";

/** A profile's saved teams (ADR 0011): party presets whose members and companion are the game's. */
export class TeamService {
  constructor(private readonly gameInstance: { id: string; gameKey: string }) {}

  private static toDto(team: { members: unknown }): TeamDto {
    return teamDto.parse({ ...team, members: (team.members as string[]) ?? [] });
  }

  /** The profile's teams, oldest first. */
  async list(): Promise<TeamDto[]> {
    const rows = await prisma.team.findMany({ where: { gameInstanceId: this.gameInstance.id }, orderBy: { createdAt: "asc" } });
    return rows.map(TeamService.toDto);
  }

  /** A new team, its members and companion checked against the catalog. */
  async create(input: unknown): Promise<TeamDto> {
    const body = createTeamInput.parse(input);
    await this.checkMembers(body.members);
    await this.checkCompanion(body.companion);
    const row = await prisma.team.create({
      data: { gameInstanceId: this.gameInstance.id, name: body.name, members: body.members as PrismaJson, companion: body.companion ?? null },
    });
    return TeamService.toDto(row);
  }

  /** A team renamed, its members or companion changed; only the fields given. */
  async update(teamId: string, input: unknown): Promise<TeamDto> {
    const team = await this.find(teamId);
    const body = updateTeamInput.parse(input);
    if (body.members) await this.checkMembers(body.members);
    await this.checkCompanion(body.companion);
    const row = await prisma.team.update({
      where: { id: team.id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.members !== undefined ? { members: body.members as PrismaJson } : {}),
        ...(body.companion !== undefined ? { companion: body.companion } : {}),
      },
    });
    return TeamService.toDto(row);
  }

  /** A team deleted. */
  async remove(teamId: string): Promise<void> {
    const team = await this.find(teamId);
    await prisma.team.delete({ where: { id: team.id } });
  }

  /** The profile's team by id; another profile's is not found. */
  private async find(teamId: string) {
    const team = await prisma.team.findFirst({ where: { id: teamId, gameInstanceId: this.gameInstance.id } });
    if (!team) throw DomainError.notFound();
    return team;
  }

  /** Every member is a character of the game's catalog (a game without a catalog takes any). */
  private async checkMembers(members: string[]): Promise<void> {
    const loadedCatalog = await getCatalog(gameOrThrow(this.gameInstance.gameKey));
    if (!loadedCatalog) return;
    const unknown = members.filter((member) => !loadedCatalog.index.characters.has(member));
    if (unknown.length) throw new DomainError(400, "unknown_catalog_id", { ids: unknown.slice(0, 20) });
  }

  /** A companion is one of the game's (its catalog's `companions`, ZZZ's Bangboos); a game without them takes none. */
  private async checkCompanion(companion: string | null | undefined): Promise<void> {
    if (!companion) return;
    const game = gameOrThrow(this.gameInstance.gameKey);
    if (!game.manifest.companion || !(await getCatalog(game))?.index.companions.has(companion)) throw new DomainError(400, "unknown_companion");
  }
}
