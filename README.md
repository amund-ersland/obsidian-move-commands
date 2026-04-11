# Filebase Hotkeys

Create new items from a `base` block in a markdown note using a hotkey.

This plugin is designed for Obsidian desktop and focuses on one core workflow:

1. Put your cursor inside a fenced `base` block in a `.md` file.
2. Run **Insert new item from base under cursor**.
3. The plugin creates a new markdown file:
   - in the folder defined by `file.folder == "..."` (if present),
   - with filename format `<epoch_seconds>_some-task.md`,
   - with YAML frontmatter keys inferred from the base block.

---

## What this plugin does

- Adds one command:
  - **Insert new item from base under cursor**
- Reads only the base block under the current cursor.
- Keeps focus in the current note (does not open the newly created file).
- Creates missing destination folders automatically.
- Prevents overwriting existing files.

---

## Supported base syntax (current behavior)

The parser is intentionally lightweight and practical. It currently supports:

- fenced code blocks:
  - ```` ```base ... ``` ````
- `filters:` section:
  - equality expressions: `key == value`
  - special handling for `file.folder == "path/to/folder"`
- `order:` section:
  - primary source for generated frontmatter keys
- `properties:` section:
  - additional source for generated frontmatter keys

### Example

```base
views:
  - type: table
    name: Table
    filters:
      and:
        - file.folder == "6-tasks"
        - status == "todo"
    order:
      - file.name
      - status
      - title
```

From this, the plugin will create something like:

- path: `6-tasks/1712345678_some-task.md`
- content:

```yaml
---
status: "todo"
title: null
---
```

Notes:
- `file.*` pseudo fields are not written into frontmatter.
- If no usable keys are found, fallback frontmatter is:
  - `title: null`

---

## Installation (manual dev install)

1. Build the plugin:
   - `npm install`
   - `npm run build`
2. Copy these files to your vault plugin folder:
   - `main.js`
   - `manifest.json`
   - `styles.css` (if used)
3. Location:
   - `<Vault>/.obsidian/plugins/obsidian-filebase-hotkeys/`
4. Reload Obsidian and enable plugin in:
   - **Settings → Community plugins**

---

## Usage

1. Open a markdown note containing a fenced `base` block.
2. Place cursor inside that block.
3. Run command:
   - **Insert new item from base under cursor**
4. Optionally assign a hotkey in:
   - **Settings → Hotkeys**

---

## Project architecture

The codebase is split into focused modules under `src/`:

```text
src/
  plugin.ts                          # Plugin lifecycle only
  constants.ts                       # Command IDs/names, notices, defaults
  types.ts                           # Shared domain types

  commands/
    insert-from-base-command.ts      # Command orchestration

  parsing/
    base-block-parser.ts             # Parse base block under cursor

  services/
    frontmatter-builder.ts           # Build ordered frontmatter keys/values
    new-item-planner.ts              # Build target path + file content plan
    item-creator.ts                  # Vault writes + folder creation + conflict guard
    new-item-creator.ts              # Thin creation wrapper

  utils/
    scalars.ts                       # Scalar parse/serialize helpers
    strings.ts                       # String parsing helpers
```

### Flow of control

1. `plugin.ts` registers command(s).
2. `insert-from-base-command.ts` validates context and reads note content.
3. `base-block-parser.ts` extracts `filters`, `order`, and `properties`.
4. `new-item-planner.ts` computes:
   - target folder/path
   - filename
   - frontmatter content (via `frontmatter-builder.ts`)
5. `item-creator.ts` creates folder(s) + file in vault.

---

## Extension guide

This section explains where to add features cleanly.

### 1) Change filename strategy

Current naming is `<epoch>_some-task.md`.

- Edit: `src/services/new-item-planner.ts`
- Functions:
  - `buildFileName`
  - `sanitizeSlug`

Ideas:
- Add date prefixes
- Add random suffix on collision
- Use title from filters/frontmatter

---

### 2) Add plugin settings (recommended next step)

Examples:
- default slug (replace `some-task`)
- open created note toggle
- fallback key when no properties found

Suggested structure:
- `src/settings.ts` for settings type/defaults/load-save
- `src/ui/settings-tab.ts` for settings UI
- keep `plugin.ts` minimal (load settings + register command)

---

### 3) Support more filter operators

Current parser supports equality (`==`) only.

- Edit: `src/parsing/base-block-parser.ts`
- Expand filter parsing to handle:
  - `!=`, `<`, `<=`, `>`, `>=`
  - contains-like expressions
- Decide mapping rules:
  - which operators should prefill frontmatter
  - which should only constrain query behavior (no frontmatter write)

---

### 4) Improve frontmatter defaults

Current behavior:
- explicit filter values win
- missing keys become `null`

- Edit: `src/services/frontmatter-builder.ts`
- Possible enhancements:
  - per-field default values
  - infer `title` from slug
  - skip null fields

---

### 5) Add tests

Even simple unit tests will add confidence for parser and planner.

Best candidates:
- `src/parsing/base-block-parser.ts` (many edge cases)
- `src/services/frontmatter-builder.ts`
- `src/services/new-item-planner.ts`

---

## Development

### Install dependencies

```bash
npm install
```

### Development watch build

```bash
npm run dev
```

### Production build

```bash
npm run build
```

---

## Compatibility and scope

- Desktop only (`isDesktopOnly: true`)
- Markdown notes as base host files
- No network calls
- No telemetry

---

## Troubleshooting

### “No base block found under cursor.”
- Ensure cursor is inside a fenced ` ```base ` block.
- Ensure the block is properly closed with ` ``` `.

### File is created but not where expected
- Check `file.folder == "..."` filter in the block.
- Ensure folder string is valid and not accidentally quoted with extra characters.

### Frontmatter keys are missing
- Ensure keys exist in `order:` and/or `properties:`.
- Ensure they are not `file.*` pseudo keys.

---

## Command reference

- ID: `insert-new-item-from-base-under-cursor`
- Name: `Insert new item from base under cursor`

Keep this command ID stable to avoid breaking user hotkey mappings.

---

## License

MIT