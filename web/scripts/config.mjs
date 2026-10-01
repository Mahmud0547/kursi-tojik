// Addresses used at build time. Override with SITE_URL and VITE_API_URL.
export const SITE_URL = (process.env.SITE_URL ?? "https://kursi-tojik.pages.dev").replace(/\/$/, "");
export const API_URL = (process.env.VITE_API_URL ?? "https://kursi-tojik-api.simorgh-dev.workers.dev").replace(/\/$/, "");
