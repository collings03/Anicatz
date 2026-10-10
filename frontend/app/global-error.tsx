"use client";

import "./globals.css";
import ErrorScreen, { isNetworkError } from "@/components/ErrorScreen";

// Used only if the root layout itself crashes, so it must render its own <html> and <body>.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body className="bg-[#14111f]">
        <ErrorScreen
          variant={isNetworkError(error) ? "network" : "error"}
          detail={error.digest ? `Reference: ${error.digest}` : undefined}
          onRetry={reset}
        />
      </body>
    </html>
  );
}