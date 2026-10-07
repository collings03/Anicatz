// Save as: frontend/lib/avatars.ts
// Built-in profile pictures. They are drawn as SVG in code, so there are no image files to upload,
// and they work on Vercel (which cannot store uploaded photos).
type Preset = {
  id: string;
  label: string;
  bg: [string, string];
  fur: string;
  ear: string;
  eye: string;
  eyes: "round" | "happy" | "sleepy" | "wink";
  extra?: "headphones" | "bow" | "star";
};

export const AVATARS: Preset[] = [
  { id: "lime", label: "Lime cat", bg: ["#c8ff3d", "#7c5cff"], fur: "#fff8e1", ear: "#ffb3c7", eye: "#1a1a2e", eyes: "round" },
  { id: "violet", label: "Violet cat", bg: ["#7c5cff", "#2a2852"], fur: "#ece7ff", ear: "#ffb3c7", eye: "#1a1a2e", eyes: "happy" },
  { id: "sunset", label: "Sunset cat", bg: ["#ff9a8b", "#ff6a88"], fur: "#fff1e6", ear: "#ffd1dc", eye: "#3b1f2b", eyes: "wink" },
  { id: "ocean", label: "Ocean cat", bg: ["#36d1dc", "#5b86e5"], fur: "#ffffff", ear: "#ffc2d1", eye: "#12263f", eyes: "round", extra: "headphones" },
  { id: "midnight", label: "Midnight cat", bg: ["#232526", "#414345"], fur: "#2b2b3a", ear: "#ff8fab", eye: "#c8ff3d", eyes: "round" },
  { id: "mint", label: "Mint cat", bg: ["#a8ff78", "#78ffd6"], fur: "#ffffff", ear: "#ffc2d1", eye: "#12342a", eyes: "sleepy" },
  { id: "orange", label: "Orange cat", bg: ["#f6d365", "#fda085"], fur: "#ffb347", ear: "#ffd1a1", eye: "#3a2108", eyes: "happy", extra: "bow" },
  { id: "grape", label: "Grape cat", bg: ["#a18cd1", "#fbc2eb"], fur: "#f3e9ff", ear: "#ffb3d9", eye: "#2d1b4e", eyes: "wink", extra: "star" },
  { id: "rose", label: "Rose cat", bg: ["#ff758c", "#ff7eb3"], fur: "#ffe3ec", ear: "#ff9fbd", eye: "#4a1230", eyes: "round", extra: "bow" },
  { id: "sky", label: "Sky cat", bg: ["#89f7fe", "#66a6ff"], fur: "#f5fbff", ear: "#ffc2d1", eye: "#14304d", eyes: "sleepy", extra: "headphones" },
  { id: "shadow", label: "Shadow cat", bg: ["#434343", "#000000"], fur: "#1c1c24", ear: "#7c5cff", eye: "#7cf0ff", eyes: "happy" },
  { id: "gold", label: "Gold cat", bg: ["#fddb92", "#d1fdff"], fur: "#fff3c4", ear: "#ffd29a", eye: "#3b2a07", eyes: "round", extra: "star" },
];

function catSvg(p: Preset) {
  const stroke = `fill="none" stroke="${p.eye}" stroke-width="3" stroke-linecap="round"`;
  const dot = (cx: number) =>
    `<circle cx="${cx}" cy="55" r="4.2" fill="${p.eye}"/><circle cx="${cx + 1.4}" cy="53.6" r="1.4" fill="#fff"/>`;

  const eyes = {
    round: dot(40) + dot(60),
    happy: `<path d="M35 56 Q40 49 45 56 M55 56 Q60 49 65 56" ${stroke}/>`,
    sleepy: `<path d="M35 54 Q40 59 45 54 M55 54 Q60 59 65 54" ${stroke}/>`,
    wink: dot(40) + `<path d="M55 56 Q60 49 65 56" ${stroke}/>`,
  }[p.eyes];

  const extra =
    p.extra === "headphones"
      ? `<path d="M20 52 Q20 22 50 22 Q80 22 80 52" fill="none" stroke="#1f1f2e" stroke-width="5" stroke-linecap="round"/><rect x="14" y="48" width="9" height="16" rx="4" fill="#1f1f2e"/><rect x="77" y="48" width="9" height="16" rx="4" fill="#1f1f2e"/>`
      : p.extra === "bow"
        ? `<path d="M50 85 L38 79 L38 91 Z M50 85 L62 79 L62 91 Z" fill="#ff5c8a"/><circle cx="50" cy="85" r="3.5" fill="#ff2e63"/>`
        : p.extra === "star"
          ? `<path d="M79 14 l2.4 5 5.4 .7 -4 3.8 1 5.4 -4.8 -2.6 -4.8 2.6 1 -5.4 -4 -3.8 5.4 -.7z" fill="#fff" opacity=".9"/>`
          : "";

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p.bg[0]}"/><stop offset="1" stop-color="${p.bg[1]}"/></linearGradient></defs>` +
    `<rect width="100" height="100" fill="url(#g)"/>` +
    `<polygon points="22,42 28,12 46,32" fill="${p.fur}"/><polygon points="78,42 72,12 54,32" fill="${p.fur}"/>` +
    `<polygon points="27,36 30,20 40,31" fill="${p.ear}"/><polygon points="73,36 70,20 60,31" fill="${p.ear}"/>` +
    `<ellipse cx="50" cy="57" rx="31" ry="26" fill="${p.fur}"/>` +
    `<circle cx="33" cy="64" r="4.5" fill="#ff7aa2" opacity=".35"/><circle cx="67" cy="64" r="4.5" fill="#ff7aa2" opacity=".35"/>` +
    eyes +
    `<path d="M47.5 61 h5 l-2.5 3.2z" fill="#ff7aa2"/>` +
    `<path d="M50 64.2 Q47 68 43.5 65.5 M50 64.2 Q53 68 56.5 65.5" fill="none" stroke="${p.eye}" stroke-width="1.6" stroke-linecap="round"/>` +
    `<path d="M30 60 L18 57 M30 64 L17 65 M70 60 L82 57 M70 64 L83 65" stroke="${p.eye}" stroke-width="1.2" stroke-linecap="round" opacity=".5"/>` +
    extra +
    `</svg>`
  );
}

/** Image address (a data URI) for a built-in avatar id, or "" when the id is unknown. */
export function avatarSrc(id: string): string {
  const p = AVATARS.find((a) => a.id === id);
  return p ? `data:image/svg+xml,${encodeURIComponent(catSvg(p))}` : "";
}