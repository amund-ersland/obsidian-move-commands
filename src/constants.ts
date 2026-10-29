/**
 * Stable identifiers and shared literals.
 *
 * Command IDs are effectively public API: Obsidian stores hotkey bindings as
 * `<manifest id>:<command id>`, so renaming one silently drops the user's
 * hotkey. Command *names* are display-only and safe to change.
 */

/** Prefix for the generated per-folder-mapping commands. */
export const FOLDER_COMMAND_ID_PREFIX = "move-to-";

/** IDs of the commands that exist regardless of configuration. */
export const COMMAND_IDS = {
	SHOW_MOVE_MENU: "show-move-menu",
	SHOW_DUPLICATE_MENU: "show-duplicate-menu",
	MOVE_TO_ROOT: "move-to-root",
	MOVE_TO_PARENT: "move-to-parent",
	MOVE_TO_NEW_FOLDER: "move-to-new-folder",
	MOVE_TO_SUBVAULT: "move-to-other-subvault",
} as const;

/** Names shown for those commands in the command palette. */
export const COMMAND_NAMES = {
	SHOW_MOVE_MENU: "Show quick move menu",
	SHOW_DUPLICATE_MENU: "Show duplicate to folder menu",
	MOVE_TO_ROOT: "Move current file to vault root",
	MOVE_TO_PARENT: "Move current file to parent folder",
	MOVE_TO_NEW_FOLDER: "Create new folder and move file there",
	MOVE_TO_SUBVAULT: "Move current file to another subvault",
} as const;

/** Stands for the active file's subvault in a mapping's folder path. */
export const SUBVAULT_PLACEHOLDER = "{SUBVAULT}";

/** Default folder whose child folders are the subvaults. */
export const DEFAULT_SUBVAULTS_FOLDER = "subvaults";

/** How the vault root is presented wherever a destination is named. */
export const VAULT_ROOT_LABEL = "Vault root";

/** Separator between a generated filename prefix and the base name. */
export const PREFIX_SEPARATOR = "_";

/** Notices that carry no interpolated values. */
export const NOTICES = {
	NO_ACTIVE_FILE: "No active file.",
	NO_FOLDER_MAPPINGS:
		"No folder mappings configured. Add one in Settings → Move Commands.",
} as const;
