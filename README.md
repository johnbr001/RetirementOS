# Retirement OS

Korean-first Windows desktop app for household retirement cash-flow planning. It stores personal financial inputs locally and never connects to financial institutions.

## Windows prerequisites

- Node.js 20 or later
- Rust toolchain (stable) with the MSVC target
- Microsoft C++ Build Tools and WebView2 Runtime

## Run in development

```powershell
npm install
npm run tauri dev
```

## Build Windows installers

```powershell
npm install
npm run tauri build
```

The MSI and NSIS installers are written under `src-tauri/target/release/bundle/`. A Rust toolchain is needed for this final desktop packaging step.

## Data and privacy

Desktop mode stores data in the app's SQLite database. The browser preview uses browser-local storage and displays a mode banner. Do not enter account numbers, passwords, resident registration numbers, or authentication details. Official institution links open in the system browser; account lookup remains manual. No values are prefilled as sample financial data.

## Current scope

Profiles, holdings, dividend assumptions, pension records, living expenses, CSV/XLSX preview and mapped import, forecast chart/table, forecast CSV export, and JSON backup are included. Institution-specific import templates, backup restore, printable reports, expanded scenario comparison, and the packaged Windows installer remain follow-up work. Pension balances should not be entered twice (for example, once as a holding and again in a pension record).
