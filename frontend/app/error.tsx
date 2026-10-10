"use client";

import { useEffect } from "react";
import ErrorScreen, { isNetworkError } from "@/components/ErrorScreen";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorScreen
      variant={isNetworkError(error) ? "network" : "error"}
      detail={error.digest ? `Reference: ${error.digest}` : undefined}
      onRetry={reset}
    />
  );
}