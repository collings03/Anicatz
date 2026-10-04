/** Reads the EN/JP title preference in the browser. */
export const clientLang = () =>
  typeof document !== "undefined" && /(?:^|; )title_lang=jp/.test(document.cookie) ? "jp" : "en";