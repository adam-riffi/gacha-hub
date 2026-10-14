import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { GameDefinition, TopUpDto, TopUpInput } from "@gacha/shared";
import { api } from "../../lib/api";
import { useToast } from "../../lib/toast";
import { CurrencyIcon } from "../CurrencyIcon";

const USD_FORMAT = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const NUMBER_FORMAT = new Intl.NumberFormat("en-GB");
const DAY = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });
const isoDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const total = (rows: TopUpDto[]) => rows.reduce((sum, row) => ({ price: sum.price + row.price, amount: sum.amount + row.amount }), { price: 0, amount: 0 });

/**
 * The top-up history (Georges, round 7: "add a top up history system too"): each
 * pack and the 30-day pass logged in one click (today, or the day picked), the
 * month's, year's and all spending, and the purchases newest first. The pass adds
 * its days.
 */
export function TopUpHistory({ instanceId, game }: { instanceId: string; game: GameDefinition }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [day, setDay] = useState(() => isoDate(new Date()));
  const [all, setAll] = useState(false);
  const list = useQuery({ queryKey: ["topups", instanceId], queryFn: () => api.get<TopUpDto[]>(`/api/instances/${instanceId}/topups`) });
  const refresh = () => Promise.all([["topups", instanceId], ["passes", instanceId], ["dashboard"]].map((queryKey) => queryClient.invalidateQueries({ queryKey })));
  const add = useMutation({
    mutationFn: (body: TopUpInput) => api.post<TopUpDto>(`/api/instances/${instanceId}/topups`, body),
    onSuccess: (topUp) => {
      toast(`${topUp.label} logged`);
      return refresh();
    },
    onError: () => toast("Not logged: the pass is at its stack", "err"),
  });
  const remove = useMutation({ mutationFn: (topUpId: string) => api.del(`/api/instances/${instanceId}/topups/${topUpId}`), onSuccess: refresh });

  const store = game.manifest.topUp;
  const pass = game.manifest.monthlyPass;
  if (!store) return null;
  const buys = [
    ...store.packs.map((pack) => ({ label: pack.bonus ? `${pack.amount} + ${pack.bonus}` : String(pack.amount), amount: pack.amount + pack.bonus, price: pack.price, pass: false })),
    ...(store.pass && pass ? [{ label: pass.name, amount: store.pass.amount, price: store.pass.price, pass: true }] : []),
  ];
  // Each pack in pulls (round 8: "a direct conversion of pack to pulls"): its premium currency, the pass's dailies over its days too.
  const cost = game.currencies.find((currency) => (currency.pullCost ?? 0) > 1)?.pullCost ?? 0;
  const pullsOf = (buy: (typeof buys)[number]) => (cost ? Math.floor((buy.amount + (buy.pass && pass ? pass.days * (pass.daily ?? 0) : 0)) / cost) : 0);
  const items = list.data ?? [];
  const now = new Date();
  const periods: [string, TopUpDto[]][] = [
    ["This month", items.filter((item) => new Date(item.at).getFullYear() === now.getFullYear() && new Date(item.at).getMonth() === now.getMonth())],
    ["This year", items.filter((item) => new Date(item.at).getFullYear() === now.getFullYear())],
    ["All time", items],
  ];
  // A past day logs at its noon; today, now.
  const at = day === isoDate(now) ? undefined : new Date(`${day}T12:00:00`).toISOString();

  return (
    <section className="card pl-tops" aria-label="Top-ups">
      <div className="spread">
        <h3>Top-ups</h3>
        <input type="date" aria-label="Day bought" value={day} max={isoDate(now)} onChange={(event) => setDay(event.target.value || isoDate(now))} />
      </div>
      <div className="pl-tops-buys">
        {buys.map((buy) => (
          <button
            key={buy.label}
            type="button"
            className={`pl-tops-buy ${buy.pass ? "is-pass" : ""}`}
            aria-label={`Log ${buy.label} for ${USD_FORMAT.format(buy.price / 100)}`}
            disabled={add.isPending}
            onClick={() => add.mutate({ label: buy.label, amount: buy.amount, price: buy.price, ...(at ? { at } : {}), ...(buy.pass ? { pass: true } : {}) })}
          >
            <span className="pl-tops-pulls font-display">
              <CurrencyIcon kind="premium" />
              {pullsOf(buy)} pulls
            </span>
            <strong>{buy.pass ? `${buy.label} · ${pass?.days ?? 30} days` : buy.label}</strong>
            <span className="font-mono pl-tops-price">{USD_FORMAT.format(buy.price / 100)}</span>
          </button>
        ))}
      </div>
      <div className="pl-tops-totals">
        {periods.map(([name, rows]) => {
          const totals = total(rows);
          return (
            <div key={name} role="group" aria-label={name}>
              <span className="kpi-label">{name}</span>
              <strong className="font-display">{USD_FORMAT.format(totals.price / 100)}</strong>
              <span className="font-mono text-muted">
                ◆ {NUMBER_FORMAT.format(totals.amount)}
                {cost ? ` · ${Math.floor(totals.amount / cost)} pulls` : ""}
              </span>
            </div>
          );
        })}
      </div>
      <ul className="pl-tops-list" aria-label="Top-up history">
        {(all ? items : items.slice(0, 5)).map((topUp) => (
          <li key={topUp.id} className={topUp.pass ? "is-pass" : ""}>
            <span className="font-mono text-muted">{DAY.format(new Date(topUp.at))}</span>
            <span>{topUp.label}</span>
            <span className="font-mono">◆ {NUMBER_FORMAT.format(topUp.amount)}</span>
            <span className="font-mono">{USD_FORMAT.format(topUp.price / 100)}</span>
            <button type="button" className="btn ghost sm" aria-label="Delete" title={`Delete ${topUp.label}`} onClick={() => remove.mutate(topUp.id)}>
              ✕
            </button>
          </li>
        ))}
      </ul>
      {items.length > 5 && (
        <button type="button" className="btn ghost sm" aria-expanded={all} onClick={() => setAll(!all)}>
          {all ? "Latest 5" : `All ${items.length}`}
        </button>
      )}
    </section>
  );
}
