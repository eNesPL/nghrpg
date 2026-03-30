# Never Going Home Foundry System

Baseline project scaffold for a Foundry VTT game system implementation for Never Going Home.

## Scripts

- `npm run build`: Compile TypeScript and copy static assets into the system root folder used by Foundry.
- `npm run sync:foundry`: Build the system and sync the Foundry runtime files to `C:\Users\kliza\AppData\Local\FoundryVTT\Data\systems\nghrpg`.
- `npm run watch`: Rebuild TypeScript on changes.

## Local usage in Foundry

1. Run `npm run build`.
2. Keep this workspace directly in your Foundry `Data/systems/nghrpg` directory, or symlink this workspace there.
3. Launch Foundry and the system should be detected from the local `system.json` manifest.

If your workspace is outside the Foundry data directory, use `npm run sync:foundry` to copy the runtime files into the installed Foundry system folder.

## Current runtime layout

- Runtime manifest generated at `system.json`
- Runtime entrypoint generated at `scripts/ngh-system.js`
- Runtime assets generated at `templates/`, `styles/`, and `lang/`

## Source layout

- System manifest source in `src/system.json`
- System entrypoint source in `src/scripts/ngh-system.ts`
- Framework modules in `src/scripts/module/` for data models and document classes
- Actor sheet class in `src/scripts/sheets/actor-sheet.ts`
- Starter actor sheet in `src/templates/actor-sheet.html`
- Base styles in `src/styles/ngh.css`

## Framework First

The current code is structured so rules can be added incrementally:

- Data schema lives in `data-models.ts`
- Document behavior hooks live in `documents.ts`
- UI registration/wiring stays in `ngh-system.ts`

This keeps rules implementation decoupled from startup/bootstrap code.

## Localization

- UI labels use translation keys via `{{localize ...}}` in templates.
- English keys live in `src/lang/en.json`.
- To add a new language:
	1. Copy `src/lang/en.json` to `src/lang/<code>.json`.
	2. Translate only the values.
	3. Add an entry to `languages` in `src/system.json` with `lang`, `name`, and `path`.
