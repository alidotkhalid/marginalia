"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProfileTheme } from "@/app/actions";
import { BANNER_STYLES, bannerBackground } from "@/lib/theme";

// A few tasteful accent presets, plus a free color picker for anything else.
const PRESETS = ["#b1934f", "#7c2d3a", "#2f4a3c", "#3a5a78", "#6d4a86", "#a8632a"];

// Own-profile-only panel: pick an accent color and a banner style, with a live
// preview, then save. Applied to the profile's banner + accent highlights.
export function ProfileCustomizer({
  accent,
  banner,
}: {
  accent: string;
  banner: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [color, setColor] = useState(accent);
  const [style, setStyle] = useState(banner);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      await updateProfileTheme(color, style);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between"
      >
        <h3 className="font-display text-lg text-ink">Customize</h3>
        <span className="text-xs font-mono text-ink-faint">{open ? "close" : "open"}</span>
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          {/* Live banner preview */}
          <div
            className="h-16 w-full rounded-card border border-parchment-dark"
            style={{ background: bannerBackground(color, style) }}
          />

          {/* Accent color */}
          <div>
            <p className="mb-2 text-xs font-mono uppercase tracking-wider text-ink-faint">
              Accent color
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-7 w-7 rounded-pill border-2 ${
                    color.toLowerCase() === c.toLowerCase()
                      ? "border-ink"
                      : "border-parchment-dark"
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={`Use ${c}`}
                />
              ))}
              <label className="ml-1 flex items-center gap-1 text-xs font-mono text-ink-faint">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-7 w-7 cursor-pointer rounded border border-parchment-dark bg-transparent"
                />
                custom
              </label>
            </div>
          </div>

          {/* Banner style */}
          <div>
            <p className="mb-2 text-xs font-mono uppercase tracking-wider text-ink-faint">
              Banner style
            </p>
            <div className="grid grid-cols-2 gap-2">
              {BANNER_STYLES.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setStyle(b.id)}
                  className={`overflow-hidden rounded-card border-2 text-left ${
                    style === b.id ? "border-ink" : "border-parchment-dark"
                  }`}
                >
                  <span
                    className="block h-8 w-full"
                    style={{ background: bannerBackground(color, b.id) }}
                  />
                  <span className="block px-2 py-1 text-xs font-medium text-ink-soft">
                    {b.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="btn-primary w-full"
          >
            {pending ? "Saving…" : "Save appearance"}
          </button>
        </div>
      )}
    </div>
  );
}
