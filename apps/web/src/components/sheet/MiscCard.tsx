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
export function MiscCard({ buildId, put, gameKey, misc: saved, passives }: { buildId: string; put: (body: { misc: CharacterMisc }) => Promise<unknown>; gameKey: string; misc: CharacterMisc | null; passives: { name: string; description?: string; icon?: string }[] }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [misc, setMisc] = useState<CharacterMisc>(saved ?? {});
  const [skin, setSkin] = useState("");
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const [edited, setEdited] = useState("");
  const save = useMutation({
    mutationFn: (next: CharacterMisc) => put({ misc: next }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["character", buildId] }),
    onError: () => toast("Could not save the misc", "err"),
  });
  const change = (next: CharacterMisc) => {
    setMisc(next);
    save.mutate(next);
  };
  const skins = misc.skins ?? [];
  const notes = misc.notes ?? [];
  const pictures = misc.pictures ?? [];
  async function addPicture(file: File | undefined) {
    if (!file) return;
    try {
      const { url } = await api.upload(file);
      change({ ...misc, pictures: [...pictures, { url }] });
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
          {passives.map((passive) => (
            <SkillRow key={passive.name} name={passive.name} text={passive.description} icon={passive.icon} gameKey={gameKey} />
          ))}
        </div>
      )}
      <div className="sh-misc-block">
        <span className="kpi-label">Skins</span>
        <ul className="sh-skins" aria-label="Skins">
          {skins.map((savedSkin) => (
            <li key={savedSkin} className="badge">
              {savedSkin}
              <button type="button" className="btn ghost sm" aria-label={`Remove ${savedSkin}`} onClick={() => change({ ...misc, skins: skins.filter((otherSkin) => otherSkin !== savedSkin) })}>
                ×
              </button>
            </li>
          ))}
        </ul>
        <form
          className="row"
          onSubmit={(event) => {
            event.preventDefault();
            if (skin.trim() && !skins.includes(skin.trim())) change({ ...misc, skins: [...skins, skin.trim()] });
            setSkin("");
          }}
        >
          <input aria-label="Add a skin" placeholder="Skin" maxLength={80} value={skin} onChange={(event) => setSkin(event.target.value)} />
          <button className="btn" type="submit">
            Add
          </button>
        </form>
      </div>
      {/* Several notes, each edited or deleted (Georges, round 7). */}
      <div className="sh-misc-block">
        <span className="kpi-label">Notes</span>
        <ul className="sh-notes" aria-label="Notes">
          {notes.map((savedNote, noteIndex) => (
            <li key={noteIndex} className="sh-note">
              {editing === noteIndex ? (
                <form
                  className="sh-note-edit"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (edited.trim()) change({ ...misc, notes: notes.map((otherNote, otherIndex) => (otherIndex === noteIndex ? edited.trim() : otherNote)) });
                    setEditing(null);
                  }}
                >
                  <textarea aria-label={`Note ${noteIndex + 1}`} rows={3} maxLength={2000} value={edited} onChange={(event) => setEdited(event.target.value)} autoFocus />
                  <button className="btn primary sm" type="submit">
                    Save note
                  </button>
                  <button className="btn ghost sm" type="button" onClick={() => setEditing(null)}>
                    Cancel
                  </button>
                </form>
              ) : (
                <>
                  <p>{savedNote}</p>
                  <button
                    className="btn ghost sm"
                    type="button"
                    onClick={() => {
                      setEditing(noteIndex);
                      setEdited(savedNote);
                    }}
                  >
                    Edit
                  </button>
                  <button className="btn ghost sm" type="button" onClick={() => change({ ...misc, notes: notes.filter((_, otherIndex) => otherIndex !== noteIndex) })}>
                    Delete
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
        <form
          className="sh-note-add"
          onSubmit={(event) => {
            event.preventDefault();
            if (note.trim()) change({ ...misc, notes: [...notes, note.trim()] });
            setNote("");
          }}
        >
          <textarea aria-label="Add a note" placeholder="A note" rows={2} maxLength={2000} value={note} onChange={(event) => setNote(event.target.value)} />
          <button className="btn" type="submit">
            Add note
          </button>
        </form>
      </div>
      <div className="sh-misc-block">
        <span className="kpi-label">Pictures</span>
        <div className="sh-pictures">
          {pictures.map((picture, pictureIndex) => (
            <figure key={picture.url} className="sh-picture">
              <a href={picture.url} target="_blank" rel="noreferrer">
                <img src={picture.url} alt={`Picture ${pictureIndex + 1}`} loading="lazy" />
              </a>
              <button type="button" className="btn ghost sm" aria-label={`Remove picture ${pictureIndex + 1}`} onClick={() => change({ ...misc, pictures: pictures.filter((otherPicture) => otherPicture.url !== picture.url) })}>
                ×
              </button>
              {/* A note under each picture (round 7). */}
              <figcaption>
                <input
                  aria-label={`Note for picture ${pictureIndex + 1}`}
                  placeholder="A note"
                  maxLength={500}
                  defaultValue={picture.note ?? ""}
                  onBlur={(event) => event.target.value.trim() !== (picture.note ?? "") && change({ ...misc, pictures: pictures.map((otherPicture, otherIndex) => (otherIndex === pictureIndex ? { url: otherPicture.url, ...(event.target.value.trim() ? { note: event.target.value.trim() } : {}) } : otherPicture)) })}
                />
              </figcaption>
            </figure>
          ))}
          {pictures.length < 12 && (
            <label className="btn sh-picture-add">
              + Picture
              <input type="file" accept="image/*" hidden aria-label="Add a picture" onChange={(event) => void addPicture(event.target.files?.[0])} />
            </label>
          )}
        </div>
      </div>
    </section>
  );
}
