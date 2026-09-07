# Move Commands

Move or copy the active file into preconfigured folders with hotkeys.

Each folder you configure becomes its own command, so you can bind
<kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>1</kbd> to "move to Zettels" and file a note
without touching the file explorer.

---

## Commands

| Command | What it does |
| --- | --- |
| `Move current file to <name>` | One per configured folder mapping. Moves — or copies, if the mapping says so — the active file there. |
| `Show quick move menu` | Fuzzy picker over every configured folder plus the vault root. Each destination keeps its own move/copy and filename settings. |
| `Show duplicate to folder menu` | Same picker, but always copies and opens the copy in a new tab. |
| `Move current file to vault root` | Moves the active file to the top level of the vault. |
| `Move current file to parent folder` | Moves the active file one folder level up. |
| `Create new folder and move file there` | Prompts for a folder path, creates it, and moves the active file into it. |

Bind any of them under **Settings → Hotkeys** (search for "Move Commands").

## Settings

**Settings → Move Commands** holds a list of folder mappings. Per mapping:

| Setting | Effect |
| --- | --- |
| Folder path | Vault-relative destination. Missing folders — including nested ones — are created on first use. |
| Display name | Shown in the command palette and the folder pickers. |
| Copy instead of move | Leaves the original in place and duplicates it. |
| Standardize filename | Lowercases the name and reduces it to `a-z`, `0-9`, and dashes. `Møte med Øystein.md` becomes `mote-med-oystein.md`. |
| Add timestamp prefix | Prefixes with the local date and time: `202601281043_my-note.md`. |
| Add cepoch prefix | Prefixes with epoch seconds in base36, reversed: `ozik9t_my-note.md`. Short, and distinct between notes created moments apart. |

Each section shows a live example of what the current options produce.

### Filename prefixes

- Timestamp wins when both prefix options are enabled.
- An existing generated prefix is replaced rather than stacked. A prefix is
  recognized as generated when it is a short, lowercase alphanumeric token
  containing at least one digit — so `kqm3fp1_task.md` is re-prefixed, while
  `meeting_notes.md` keeps its "meeting".
- With no prefix option enabled, the filename's prefix is left alone.

## Behavior worth knowing

- Moves never overwrite: if a file already occupies the destination path, the
  move is refused with a notice.
- Copies never overwrite either — they get a counter instead (`note-1.md`).
- Moves go through Obsidian's file manager, so links to the note are updated.
- Deleting a mapping removes its command; any hotkey bound to it stops working.

## Development

```bash
npm install
npm run dev     # watch build
npm run build   # type-check, then production bundle
```

The entry point is `src/main.ts` and the bundle is written to `main.js` at the
plugin root, next to `manifest.json` and `styles.css`.

```
src/
  main.ts                        # lifecycle, settings persistence, registration
  constants.ts                   # stable command IDs and shared literals
  types.ts                       # shared domain types
  commands/
    file-operation-runner.ts     # destination choice -> vault change + notice
    folder-commands.ts           # one command per folder mapping
    utility-commands.ts          # menus, parent folder, root, new folder
  services/
    file-operations.ts           # the move and copy vault mutations
    filename.ts                  # prefixes and slugs (pure string work)
    folder-choices.ts            # mappings -> destination choices
    vault-paths.ts               # path normalization, folder creation
  settings/
    defaults.ts                  # defaults and validation of persisted data
    settings-tab.ts              # settings UI
    types.ts                     # persisted settings shape
  ui/
    folder-suggest-modal.ts      # fuzzy destination picker
    text-input-modal.ts          # single-field prompt
  utils/
    errors.ts
```

### Plugin ID

The manifest ID is `quick-move`, which predates the `obsidian-move-commands`
folder name. Obsidian keys hotkey bindings as `<plugin id>:<command id>`, so
the ID stays as it is — renaming it would silently drop every bound hotkey.
The same goes for mapping IDs, which are baked into `move-to-<mapping id>`.

## License

MIT — see [LICENSE](LICENSE).
