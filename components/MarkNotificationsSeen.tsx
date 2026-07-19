"use client";

import { useEffect, useRef } from "react";
import { markNotificationsSeen } from "@/app/actions";

/**
 * Clears the nav dot once the reader has actually opened Notifications.
 * Runs after paint, so the list they are looking at is the list they were
 * notified about.
 */
export function MarkNotificationsSeen() {
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    markNotificationsSeen();
  }, []);

  return null;
}
