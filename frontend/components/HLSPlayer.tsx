
"use client";

import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

type Props = {
  src: string;
};

export default function HLSPlayer({ src }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const [status, setStatus] = useState<
    "loading" | "ready" | "error"
  >("loading");

  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const video = videoRef.current;

    if (!video || !src) {
      setStatus("error");
      setErrorMessage("No HLS URL provided");
      return;
    }

    let hls: Hls | null = null;

    setStatus("loading");
    setErrorMessage("");

    console.log("HLS source:", src);
    console.log("HLS supported:", Hls.isSupported());

    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
      });

      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        console.log("HLS: media attached");
      });

      hls.on(Hls.Events.MANIFEST_LOADING, (_event, data) => {
        console.log("HLS: loading manifest:", data.url);
      });

      hls.on(Hls.Events.MANIFEST_LOADED, (_event, data) => {
        console.log("HLS: manifest loaded");
        console.log("Manifest:", data);
      });

      hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
        console.log("HLS: manifest parsed");
        console.log("Quality levels:", data.levels);

        setStatus("ready");
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        console.error("========== HLS ERROR ==========");
        console.error("Type:", data.type);
        console.error("Details:", data.details);
        console.error("Fatal:", data.fatal);
        console.error("URL:", data.url);
        console.error("Response:", data.response);
        console.error("Full error:", data);
        console.error("================================");

        setErrorMessage(
          `${data.type} - ${data.details}${
            data.response?.code
              ? ` (HTTP ${data.response.code})`
              : ""
          }`
        );

        if (data.fatal) {
          setStatus("error");
        }
      });

      hls.loadSource(src);
      hls.attachMedia(video);
    } else if (
      video.canPlayType("application/vnd.apple.mpegurl")
    ) {
      console.log("Using native HLS");

      video.src = src;

      const handleLoadedMetadata = () => {
        console.log("Native HLS loaded");
        setStatus("ready");
      };

      const handleError = () => {
        console.error("Native video error:", video.error);

        setStatus("error");

        setErrorMessage(
          video.error?.message || "Native HLS playback error"
        );
      };

      video.addEventListener(
        "loadedmetadata",
        handleLoadedMetadata
      );

      video.addEventListener("error", handleError);

      return () => {
        video.removeEventListener(
          "loadedmetadata",
          handleLoadedMetadata
        );

        video.removeEventListener("error", handleError);

        video.removeAttribute("src");
        video.load();
      };
    } else {
      setStatus("error");
      setErrorMessage("This browser does not support HLS");
    }

    return () => {
      hls?.destroy();

      video.removeAttribute("src");
      video.load();
    };
  }, [src]);

  return (
    <div className="relative h-full w-full bg-black">
      <video
        ref={videoRef}
        controls
        playsInline
        preload="metadata"
        className="h-full w-full object-contain"
      />

      {status === "loading" && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="text-center text-white">
            <span className="mx-auto mb-3 block h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />

            <p className="text-sm">
              Loading video...
            </p>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="absolute inset-0 grid place-items-center bg-black p-6 text-center text-white">
          <div className="max-w-xl">
            <p className="font-semibold">
              Video unavailable
            </p>

            <p className="mt-2 text-xs text-red-400">
              {errorMessage}
            </p>

            <p className="mt-3 break-all text-xs text-white/30">
              {src}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
