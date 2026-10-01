// After `vite build`: writes dist/_headers (security headers for Cloudflare Pages), sitemap.xml and robots.txt.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { API_URL, SITE_URL } from "./config.mjs";

const apiOrigin = new URL(API_URL).origin;

// The pages have no inline scripts or styles, so the policy can forbid them entirely.
for (const file of ["index.html", "ru/index.html", "en/index.html"]) {
  const html = readFileSync(join("dist", file), "utf8");
  if (/<script(?![^>]*\ssrc=)[^>]*>/.test(html) || /<style[\s>]/.test(html) || /\sstyle="/.test(html)) {
    console.error(`${file} contains inline script or style; the CSP would block it`);
    process.exit(1);
  }
}

const csp = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  `connect-src 'self' ${apiOrigin}`,
  "manifest-src 'self'",
  "worker-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
].join("; ");

writeFileSync(
  "dist/_headers",
  `/*
  Content-Security-Policy: ${csp}
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()

/assets/*
  Cache-Control: public, max-age=31536000, immutable
`,
);

const today = new Date().toISOString().slice(0, 10);
const urls = ["/", "/ru/", "/en/"];
const alternates = `<xhtml:link rel="alternate" hreflang="tg" href="${SITE_URL}/"/><xhtml:link rel="alternate" hreflang="ru" href="${SITE_URL}/ru/"/><xhtml:link rel="alternate" hreflang="en" href="${SITE_URL}/en/"/>`;
writeFileSync(
  "dist/sitemap.xml",
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls
    .map((u) => `  <url><loc>${SITE_URL}${u}</loc><lastmod>${today}</lastmod>${alternates}</url>`)
    .join("\n")}\n</urlset>\n`,
);
writeFileSync("dist/robots.txt", `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);

console.log(`postbuild: _headers, sitemap.xml, robots.txt (${readdirSync("dist").length} entries in dist)`);
