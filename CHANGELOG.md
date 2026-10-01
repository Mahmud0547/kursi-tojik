# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [2.0.0] — 2026-10-02

### Added
- Own database (Cloudflare D1) filled from nbt.tj every 3 hours, with a year of history.
- API: latest rates, history, bank rates, health.
- Telegram bot: conversion, rates, best bank rates, daily digest (tj/ru/en).
- New design; English version; converter for every NBT currency; one-year chart; bank table with the best rates first.
- Tests (API, unit, browser with accessibility and CSP checks), CI, CodeQL, Dependabot, English documentation.

### Removed
- Money-transfer calculator (its tariffs were illustrative, not official).
- Hand-typed bank rates.
- Berkeley Mono font (no licence to redistribute).

## [1.0.0] — 2026-09-20
- First version: NBT proxy worker and a single-page site.
