export interface Me {
  user: {
    id: string;
    discordId: string;
    username: string;
    avatarUrl: string | null;
  } | null;
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

export interface AccountLite {
  id: string;
  label: string;
  regionKey: string | null;
}

export interface CurrencyState {
  id: string;
  key: string;
  value: number;
}

export interface InstanceListItem {
  id: string;
  gameKey: string;
  name: string;
  accent: string;
  accounts: AccountLite[];
}

export interface InstanceDetail {
  id: string;
  gameKey: string;
  accounts: {
    id: string;
    label: string;
    regionKey: string | null;
    currencies: CurrencyState[];
    characters: { id: string; name: string; portraitUrl: string | null }[];
  }[];
}

export interface CharacterDetail {
  id: string;
  accountId: string;
  gameKey: string;
  name: string;
  portraitUrl: string | null;
  doc: Record<string, unknown>;
}

export interface TaskItem {
  id: string;
  scope: string;
  refId: string;
  type: string;
  title: string;
  cadence: string | null;
  target: number | null;
  progress: number;
  items: { label: string; done: boolean }[] | null;
  reminder: unknown;
  lastCompletedAt: string | null;
  doneThisCycle?: boolean;
  nextReset?: string;
}

export interface DashboardData {
  games: {
    instanceId: string;
    gameKey: string;
    name: string;
    accent: string;
    accounts: {
      id: string;
      label: string;
      regionKey: string | null;
      characterCount: number;
      currencies: {
        key: string;
        label: string;
        value: number;
        cap: number | null;
        regenPerHour: number | null;
      }[];
      dailies: TaskItem[];
      nextReset: string | null;
    }[];
  }[];
  goals: TaskItem[];
}
