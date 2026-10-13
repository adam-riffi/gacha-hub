import { useRef, useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CharacterMisc } from "@gacha/shared";
import { api } from "../../lib/api";
import { useDismiss } from "../../lib/dismiss";
import { useToast } from "../../lib/toast";
import { CatalogIcon } from "../CatalogIcon";

/**
 * A skill's row: its icon and name, the name opening what it does in a bubble
 * over the page, closed by a click outside (Georges, round 6: "when unrolling
 * the talent effect it stretches everything; I'd rather read it in a bubble;
 * also add the talent icon").
 */
export function SkillRow({ name, text, icon, gameKey, children }: { name: string; text?: string; icon?: string; gameKey: string; children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useDismiss(box, () => setOpen(false), open);
  return (
    <div className="sh-row sh-skill-row" ref={box}>
      <span className="sh-skill-name">
        {icon && <CatalogIcon gameKey={gameKey} kind="talent" icon={icon} name={name} className="sh-talent-icon" />}
        {text ? (
          <button type="button" className="sh-skill" aria-expanded={open} onClick={() => setOpen(!open)}>
            {name}
          </button>
        ) : (
          <span>{name}</span>
        )}
      </span>
      {children}
      {open && text && (
        <div className="sh-bubble" role="note" aria-label={name}>
          {text}
        </div>
      )}
    </div>
  );
}

/**
 * A build's misc (Georges, round 6: "a misc part for each character where
 * non-upgradable talents, skins and other things are included, or where I
 * could write notes or add pictures"): the passives the talents do not level
 * (from the catalog), the skins, notes and pictures (uploads), each saved as
 * it changes.
 */
export function MiscCard({ buildId, gameKey, misc: saved, passives }: { buildId: string; gameKey: string; misc: CharacterMisc | null; passives: { name: string; description?: string; icon?: string }[] }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [misc, setMisc] = useState<CharacterMisc>(saved ?? {});
  const [skin, setSkin] = useState("");
  const save = useMutation({
    mutationFn: (next: CharacterMisc) => api.put(`/api/characters/${buildId}`, { misc: next }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["character", buildId] }),
    onError: () => toast("Could not save the misc", "err"),
  });
  const change = (next: CharacterMisc) => {
    setMisc(next);
    save.mutate(next);
  };
  const skins = misc.skins ?? [];
  const pictures = misc.pictures ?? [];
  async function addPicture(file: File | undefined) {
    if (!file) return;
    try {
      const { url } = await api.upload(file);
      change({ ...misc, pictures: [...pictures, url] });
    } catch {
      toast("Upload failed", "err");
    }
  }

  return (
    <section className="card sh-misc" aria-label="Misc">
      <h3>Misc</h3>
      {passives.length > 0 && (
        <div className="sh-misc-block">
          <span className="kpi-label">Passives</span>
          {passives.map((p) => (
            <SkillRow key={p.name} name={p.name} text={p.description} icon={p.icon} gameKey={gameKey} />
          ))}
        </div>
      )}
      <div className="sh-misc-block">
        <span className="kpi-label">Skins</span>
        <ul className="sh-skins" aria-label="Skins">
          {skins.map((s) => (
            <li key={s} className="badge">
              {s}
              <button type="button" className="btn ghost sm" aria-label={`Remove ${s}`} onClick={() => change({ ...misc, skins: skins.filter((x) => x !== s) })}>
                ×
              </button>
            </li>
          ))}
        </ul>
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault();
            if (skin.trim() && !skins.includes(skin.trim())) change({ ...misc, skins: [...skins, skin.trim()] });
            setSkin("");
          }}
        >
          <input aria-label="Add a skin" placeholder="Skin" maxLength={80} value={skin} onChange={(e) => setSkin(e.target.value)} />
          <button className="btn" type="submit">
            Add
          </button>
        </form>
      </div>
      <div className="sh-misc-block">
        <label className="kpi-label" htmlFor="sh-notes">
          Notes
        </label>
        <textarea id="sh-notes" rows={3} maxLength={4000} defaultValue={misc.notes ?? ""} onBlur={(e) => e.target.value !== (misc.notes ?? "") && change({ ...misc, notes: e.target.value })} />
      </div>
      <div className="sh-misc-block">
        <span className="kpi-label">Pictures</span>
        <div className="sh-pictures">
          {pictures.map((url, i) => (
            <figure key={url} className="sh-picture">
              <a href={url} target="_blank" rel="noreferrer">
                <img src={url} alt={`Picture ${i + 1}`} loading="lazy" />
              </a>
              <button type="button" className="btn ghost sm" aria-label={`Remove picture ${i + 1}`} onClick={() => change({ ...misc, pictures: pictures.filter((x) => x !== url) })}>
                ×
              </button>
            </figure>
          ))}
          {pictures.length < 12 && (
            <label className="btn sh-picture-add">
              + Picture
              <input type="file" accept="image/*" hidden aria-label="Add a picture" onChange={(e) => void addPicture(e.target.files?.[0])} />
            </label>
          )}
        </div>
      </div>
    </section>
  );
}
