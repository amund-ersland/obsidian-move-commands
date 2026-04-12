/**
 * Centralized constants for the Filebase Hotkeys plugin.
 * Keeping these values in one place makes command registration
 * and future configuration changes safer and easier.
 */

/** Plugin command identifiers (stable IDs for hotkey bindings). */
export const COMMAND_IDS = {
	INSERT_NEW_ITEM_FROM_BASE_UNDER_CURSOR:
		"insert-new-item-from-base-under-cursor",
} as const;

/** User-facing command names shown in Obsidian's command palette. */
export const COMMAND_NAMES = {
	INSERT_NEW_ITEM_FROM_BASE_UNDER_CURSOR:
		"Insert new item from base under cursor",
} as const;

/** Defaults used when generating a new note from a base block. */
export const FILE_DEFAULTS = {
	/** Suffix used after epoch prefix: `<epoch>_<slug>.md` */
	DEFAULT_SLUG: "some-task",
	/** Markdown extension for created files. */
	EXTENSION: ".md",
} as const;

/** Notice messages used by command flow. */
export const NOTICES = {
	NO_ACTIVE_FILE: "No active file.",
	ACTIVE_FILE_NOT_MARKDOWN: "Active file must be a markdown file.",
	NO_BASE_BLOCK_UNDER_CURSOR: "No base block found under cursor.",
	NO_BASE_BLOCK_UNDER_PREVIEW_HOVER:
		"No base block found under mouse hover in preview mode.",
	CREATE_FAILED_PREFIX: "Could not create new item:",
	CREATED_PREFIX: "Created:",
} as const;
