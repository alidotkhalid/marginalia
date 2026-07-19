"use client";

import { useEffect } from "react";
import { syncTimezone } from "@/app/actions";

/**
 * Reports the browser's timezone once per session, so streak days roll over at
 * the reader's own midnight rather than UTC's.
 */
export function TimezoneSync() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem("m_tz_synced")) return;
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) {
        sessionStorage.setItem("m_tz_synced", "1");
        syncTimezone(tz);
      }
    } catch {
      /* no timezone available; UTC remains the fallback */
    }
  }, []);

  return null;
}
