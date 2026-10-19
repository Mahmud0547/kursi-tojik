# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [3.0.0] — 2026-10-19

### Added
- App layout for phones: bottom tabs (Rates, Convert, Banks, History), one section at a time, works from the home screen.
- "Where to exchange": for an amount of cash, the best and the worst bank today and the difference in somoni (sell or buy).
- All 36 National Bank currencies with search, names in Tajik, Russian and English, and a star to pin a currency to the board.
- Press a board card to show that currency in the big number at the top (remembered).
- Converter: quick amounts, copy the result, the same sum in the other main currencies.
- History: low, high and change for the chosen period.
- Settings: light / dark / automatic theme, large text, language, how to install on a phone.
- Refresh button, "updated at" and offline status, automatic reload when the app comes back after 15 minutes, share button.

### Changed
- New visual design (rem-based, so "large text" scales everything), offline cache v3, manifest for standalone use.

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
