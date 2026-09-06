import { useState, type ReactNode } from "react";
import { api } from "../lib/api";
import { useToast } from "../lib/toast";

/** Shared identity column (portrait, upload, name) used by every game sheet. */
export function PortraitPanel({
  name,
  portraitUrl,
  onName,
  onPortrait,
  children,
}: {
  name: string;
  portraitUrl: string | null;
  onName: (n: string) => void;
  onPortrait: (u: string | null) => void;
  children?: ReactNode;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <div className="card stack">
      {portraitUrl ? (
        <img className="portrait" src={portraitUrl} alt={name} />
      ) : (
        <div className="portrait" style={{ display: "grid", placeItems: "center" }}>
          <span className="muted small">No image</span>
        </div>
      )}
      <label className="btn sm" style={{ width: "100%", justifyContent: "center" }}>
        {busy ? "Uploading…" : "Upload image"}
        <input
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          disabled={busy}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setBusy(true);
            try {
              const { url } = await api.upload(file);
              onPortrait(url);
              toast("Image uploaded");
            } catch {
              toast("Upload failed", "err");
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
      <div className="field" style={{ marginBottom: 0 }}>
        <label>Name</label>
        <input value={name} onChange={(e) => onName(e.target.value)} />
      </div>
      {children}
    </div>
  );
}
