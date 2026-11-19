# Retirement OS implementation plan

This repository was empty when implementation began. The product is a Korean-first Windows desktop app for private retirement planning. It must not connect to financial institutions, store credentials, scrape sites, or fabricate household balances.

## Phase 1 — Desktop foundation
- [x] Create a Tauri 2 + React + TypeScript + Vite project structure.
- [x] Add Korean desktop navigation, local database initialization, household profiles, and official source links.
- [x] Provide an empty state until the user enters real information.

## Phase 2 — Manual data
- [x] Add and manage household people, asset holdings, pension income, and living expenses.
- [x] Record source and valuation/retrieval date for user supplied values.
- [x] Keep calculations in standalone deterministic TypeScript functions.

## Phase 3 — File import
- [x] CSV/XLSX preview, column mapping, duplicate warnings, and explicit import confirmation.
- [ ] Add support for institution-specific templates after sample files are available.

## Phase 4 — Forecasts
- [x] Annual retirement cash flow, nominal/real amounts, income/expense gap, and asset depletion estimate.
- [x] Surface assumptions and label forecasts as estimates.
- [ ] Expand scenario editing, taxes, and phased withdrawal settings.

## Phase 5 — Reports and backup
- [x] CSV forecast export and database backup/restore.
- [ ] Add printable report and scenario comparison.

## Phase 6 — Windows release
- [x] Add Windows Tauri bundler configuration and app icons placeholder configuration.
- [ ] Install Rust/Tauri prerequisites and produce/sign a Windows installer on a Windows build host.
- [ ] Run the full build and acceptance checks once dependencies are available.

## Current implementation notes
- Financial data uses Tauri SQLite in desktop mode. Browser preview mode uses browser-local storage and displays a persistent mode notice.
- Official financial services are opened in the system browser. No credentials, APIs, or scraping are used.
- All balances start empty. Values are only created after user entry/import.
