"use client";

import { useCallback, useEffect, useState } from "react";
import ErrorScreen from "./ErrorScreen";

/**
 * Mount once in app/layout.tsx. When the browser goes offline it covers the page with the
 * network alert screen, and removes it automatically when the connection returns.
 */
export default function NetworkStatus() {
  const [offline, setOffline] = useState(false);
  const [backOnline, setBackOnline] = useState(false);

  useEffect(() => {
    setOffline(!navigator.onLine);

    const goOffline = () => {
      setBackOnline(false);
      setOffline(true);
    };
    const goOnline = () => {
      setOffline(false);
      setBackOnline(true);
      window.setTimeout(() => setBackOnline(false), 3000);
    };

    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  // "Try again" does a real request, because navigator.onLine can be wrong behind captive portals.
  const recheck = useCallback(async () => {
    try {
      await fetch(`${window.location.origin}/favicon.ico`, { method: "HEAD", cache: "no-store" });
      setOffline(false);
    } catch {
      setOffline(true);
    }
  }, []);

  if (offline) {
    return (
      <div className="fixed inset-0 z-[9999] overflow-y-auto bg-[#14111f]">
        <ErrorScreen variant="network" onRetry={recheck} />
      </div>
    );
  }

  if (backOnline) {
    return (
      <div
        role="status"
        className="fixed bottom-4 left-1/2 z-[9999] -translate-x-1/2 rounded-lg bg-[#241f3a] px-4 py-2 text-sm font-medium text-[#f2eefc] shadow-lg"
      >
        You're back online
      </div>
    );
  }

  return null;
}