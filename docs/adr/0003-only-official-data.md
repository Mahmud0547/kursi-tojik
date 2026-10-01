# 3. Only official, dated data

Date: 2026-10-01 · Status: accepted

## Context
v1 shipped a money-transfer fee calculator built on "illustrative" tariffs and a hand-typed bank rate list. Numbers that look real but are not hurt trust in a finance site.

## Decision
Show only what nbt.tj publishes, always with its date and source. Remove features without a verifiable source.

## Consequences
- The transfer calculator is gone until there is an official, machine-readable source.
- Bank rates show NBT's own update time, which can be days old; the site says so.
