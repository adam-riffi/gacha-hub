import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { GameDefinition, TopUpDto, TopUpInput } from "@gacha/shared";
import { api } from "../../lib/api";
import { useToast } from "../../lib/toast";

const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const NUM = new Intl.NumberFormat("en-GB");
const DAY = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const total = (rows: TopUpDto[]) => rows.reduce((s, r) => ({ price: s.price + r.price, amount: s.amount + r.amount }), { price: 0, amount: 0 });

/**
 * The top-up history (Georges, round 7: "add a top up history system too"): each
 * pack and the 30-day pass logged in one click (today, or the day picked), the
 * month's, year's and all spending, and the purchases newest first. The pass adds
 * its days.
 */
export function TopUpHistory({ instanceId, game }: { instanceId: string; game: GameDefinition }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [day, setDay] = useState(() => iso(new Date()));
  const list = useQuery({ queryKey: ["topups", instanceId], queryFn: () => api.get<TopUpDto[]>(`/api/instances/${instanceId}/topups`) });
  const refresh = () => Promise.all([["topups", instanceId], ["passes", instanceId], ["dashboard"]].map((queryKey) => qc.invalidateQueries({ queryKey })));
  const add = useMutation({
    mutationFn: (body: TopUpInput) => api.post<TopUpDto>(`/api/instances/${instanceId}/topups`, body),
    onSuccess: (t) => {
      toast(`${t.label} logged`);
      return refresh();
    },
    onError: () => toast("Not logged: the pass is at its stack", "err"),
  });
  const remove = useMutation({ mutationFn: (topUpId: string) => api.del(`/api/instances/${instanceId}/topups/${topUpId}`), onSuccess: refresh });

  const store = game.manifest.topUp;
  const pass = game.manifest.monthlyPass;
  if (!store) return null;
  const buys = [
    ...store.packs.map((p) => ({ label: p.bonus ? `${p.amount} + ${p.bonus}` : String(p.amount), amount: p.amount + p.bonus, price: p.price, pass: false })),
    ...(store.pass && pass ? [{ label: pass.name, amount: store.pass.amount, price: store.pass.price, pass: true }] : []),
  ];
  const items = list.data ?? [];
  const now = new Date();
  const periods: [string, TopUpDto[]][] = [
    ["This month", items.filter((t) => new Date(t.at).getFullYear() === now.getFullYear() && new Date(t.at).getMonth() === now.getMonth())],
    ["This year", items.filter((t) => new Date(t.at).getFullYear() === now.getFullYear())],
    ["All time", items],
  ];
  // A past day logs at its noon; today, now.
  const at = day === iso(now) ? undefined : new Date(`${day}T12:00:00`).toISOString();

  return (
    <section className="card pl-tops" aria-label="Top-ups">
      <div className="spread">
        <h3>Top-ups</h3>
        <input type="date" aria-label="Day bought" value={day} max={iso(now)} onChange={(e) => setDay(e.target.value || iso(now))} />
      </div>
      <div className="pl-tops-buys">
        {buys.map((b) => (
          <button
            key={b.label}
            type="button"
            className={`pl-tops-buy ${b.pass ? "is-pass" : ""}`}
            aria-label={`Log ${b.label} for ${USD.format(b.price / 100)}`}
            disabled={add.isPending}
            onClick={() => add.mutate({ label: b.label, amount: b.amount, price: b.price, ...(at ? { at } : {}), ...(b.pass ? { pass: true } : {}) })}
          >
            <strong>{b.label}</strong>
            <span className="mn">{USD.format(b.price / 100)}</span>
          </button>
        ))}
      </div>
      <div className="pl-tops-totals">
        {periods.map(([name, rows]) => {
          const t = total(rows);
          return (
            <div key={name} role="group" aria-label={name}>
              <span className="kpi-label">{name}</span>
              <strong className="cd">{USD.format(t.price / 100)}</strong>
              <span className="mn mu">◆ {NUM.format(t.amount)}</span>
            </div>
          );
        })}
      </div>
      <ul className="pl-tops-list" aria-label="Top-up history">
        {items.map((t) => (
          <li key={t.id} className={t.pass ? "is-pass" : ""}>
            <span className="mn mu">{DAY.format(new Date(t.at))}</span>
            <span>{t.label}</span>
            <span className="mn">◆ {NUM.format(t.amount)}</span>
            <span className="mn">{USD.format(t.price / 100)}</span>
            <button type="button" className="btn ghost sm" aria-label="Delete" title={`Delete ${t.label}`} onClick={() => remove.mutate(t.id)}>
              ✕
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
