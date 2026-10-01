# 2. No frontend framework

Date: 2026-10-01 · Status: accepted

## Context
The site is one page with a few interactive parts. Most visitors use phones, often on slow mobile networks.

## Decision
Vite + TypeScript modules and plain CSS. Pages per language are generated at build time from one template.

## Consequences
- About 8 KB of JavaScript (gzip) and a Lighthouse performance score of 99.
- No inline code, so the Content-Security-Policy can be strict.
- More manual DOM code; kept small with helpers in `src/dom.ts`, and all text goes through `textContent`.
