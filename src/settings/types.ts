import type { FilenameOptions } from "../types";

/**
 * One configured destination folder.
 *
 * `id` is baked into the command ID (`move-to-<id>`), so it must never change
 * for an existing mapping: doing so drops whatever hotkey the user bound to it.
 */
export interface FolderMapping extends FilenameOptions {
	/** Stable identifier; part of the generated command ID. */
	id: string;

	/** Vault-relative folder path, e.g. `3-content/1-zettels`. */
	folderPath: string;

	/** Name shown in the command palette and folder pickers. */
	displayName: string;

	/** Duplicate the file into the folder instead of moving it there. */
	copyInsteadOfMove: boolean;
}

/** Everything persisted through `loadData()` / `saveData()`. */
export interface MoveCommandsSettings {
	folderMappings: FolderMapping[];
}
