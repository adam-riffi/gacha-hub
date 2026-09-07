import type {
  CharacterDto,
  CharacterSummaryDto,
  CurrencyStateDto,
  DashboardDto,
  InstanceDto,
  ReminderRuleDto,
  TaskDto,
} from "@gacha/shared";

/* Client-side view types are composed from the shared DTOs so the API and
 * UI can never drift apart. Server-added display fields (name/accent) are
 * layered on top. */

export interface Me {
  user: {
    id: string;
    discordId: string;
    username: string;
    avatarUrl: string | null;
  } | null;
  isAdmin: boolean;
  oauth: boolean;
  devLogin: boolean;
}

export interface GameCatalogItem {
  key: string;
  name: string;
  accent: string;
  currencies: number;
  regions: { key: string; label: string }[];
}

export type InstanceListItem = InstanceDto & { name: string; accent: string };

export type InstanceDetail = InstanceListItem & {
  currencies: CurrencyStateDto[];
  characters: CharacterSummaryDto[];
};

export type CharacterDetail = CharacterDto & { gameKey: string };

export type TaskItem = TaskDto;
export type DashboardData = DashboardDto;
export type ReminderRule = ReminderRuleDto;
