import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { REDEEM_CODE_SOURCES, type GameCodesDto, type RedeemCodeDto } from "@gacha/shared";
import { api } from "../../lib/api";
import { useToast } from "../../lib/toast";

/**
 * A game's redeem codes (Georges, round 11: "I don't need to go around X websites to check my data"): the working ones not yet
 * redeemed first, each with its rewards, Copy, the official page to redeem it on, and a tick once redeemed; the redeemed below.
 */
export function RedeemCodesCard({ instanceId, gameKey }: { instanceId: string; gameKey: string }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const hasSource = Boolean(REDEEM_CODE_SOURCES[gameKey]);
  const gameCodes = useQuery({ queryKey: ["codes", instanceId], queryFn: () => api.get<GameCodesDto>(`/api/instances/${instanceId}/codes`), enabled: hasSource });
  const setRedeemed = useMutation({
    mutationFn: (change: { code: string; redeemed: boolean }) => api.put(`/api/instances/${instanceId}/codes/${change.code}`, { redeemed: change.redeemed }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["codes", instanceId] }),
    onError: () => toast("Not saved", "err"),
  });
  if (!hasSource) return null;
  const codes = gameCodes.data?.codes ?? [];
  const toRedeem = codes.filter((code) => !code.redeemed);
  const redeemed = codes.filter((code) => code.redeemed);
  const copy = (code: string) =>
    navigator.clipboard?.writeText(code).then(
      () => toast(`${code} copied`),
      () => toast("Not copied", "err"),
    );
  const row = (code: RedeemCodeDto) => (
    <div key={code.code} className={`codes-row ${code.redeemed ? "is-redeemed" : ""}`} role="group" aria-label={code.code}>
      <span className="codes-code mn">{code.code}</span>
      <span className="codes-rewards">{code.rewards || "—"}</span>
      <span className="row codes-actions">
        <button type="button" className="btn" onClick={() => void copy(code.code)}>
          Copy
        </button>
        {code.redeemUrl && (
          <a className="btn primary" href={code.redeemUrl} target="_blank" rel="noopener noreferrer">
            Redeem ↗
          </a>
        )}
        <label className="codes-tick">
          <input type="checkbox" checked={code.redeemed} disabled={setRedeemed.isPending} onChange={() => setRedeemed.mutate({ code: code.code, redeemed: !code.redeemed })} />
          Redeemed
        </label>
      </span>
    </div>
  );
  return (
    <section className="card codes-card" aria-label="Codes">
      <div className="spread">
        <h3>Codes</h3>
        <span className="kpi-label">{gameCodes.data?.available === false ? "source unreachable" : `${toRedeem.length} to redeem`}</span>
      </div>
      {toRedeem.map(row)}
      {redeemed.length > 0 && (
        <details className="codes-redeemed">
          <summary className="kpi-label">Redeemed {redeemed.length}</summary>
          {redeemed.map(row)}
        </details>
      )}
    </section>
  );
}
