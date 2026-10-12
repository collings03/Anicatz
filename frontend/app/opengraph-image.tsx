import { ImageResponse } from "next/og";

// The picture shown when your link is shared (WhatsApp, Discord, X, Facebook...) and no page-specific image exists.
export const alt = "anicatz - Your anime. Your world.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f0e24",
          color: "#f2eefc",
        }}
      >
        <div style={{ display: "flex", fontSize: 150, fontWeight: 800, letterSpacing: -4 }}>
          <span>ani</span>
          <span style={{ color: "#d9f96a" }}>catz</span>
        </div>
        <div style={{ display: "flex", fontSize: 44, color: "#a59fc0", marginTop: 12 }}>Your anime. Your world.</div>
      </div>
    ),
    { ...size },
  );
}