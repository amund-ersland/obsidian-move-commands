/**
 * Shared domain types for the Move Commands plugin.
 *
 * These describe *what* an operation should do; the vault work itself lives in
 * `src/services/`, and user-facing wiring lives in `src/commands/`.
 */

/** Whether the active file is relocated or left in place and duplicated. */
export type FileOperation = "move" | "copy";

/**
 * Filename transformations applied to a file as it lands in a folder.
 *
 * Every flag is opt-in per folder mapping, so the default behavior is to keep
 * the filename exactly as it is.
 */
export interface FilenameOptions {
	/** Prefix the name with a local `YYYYMMDDHHmm` timestamp. */
	addTimestampPrefix: boolean;

	/**
	 * Prefix the name with a "cepoch": epoch seconds in base36, reversed.
	 * Ignored when {@link addTimestampPrefix} is enabled.
	 */
	addCepochPrefix: boolean;

	/** Lowercase the name and reduce it to `a-z0-9-` characters. */
	standardizeFilename: boolean;
}

/** A filename split into its generated prefix, base name, and extension. */
export interface ParsedFilename {
	/** Generated prefix without its separator, or `null` when there is none. */
	prefix: string | null;

	/** The meaningful part of the name, without prefix or extension. */
	base: string;

	/** Extension including the leading dot, or `""` when the name has none. */
	extension: string;
}

/** One destination as offered in a folder picker or bound to a command. */
export interface FolderChoice {
	/** Human-readable destination name, shown in menus and notices. */
	label: string;

	/** Vault-relative folder path; `""` means the vault root. */
	folderPath: string;

	/** What to do with the active file when this destination is chosen. */
	operation: FileOperation;

	/** Filename transformations to apply on arrival. */
	filenameOptions: FilenameOptions;
}
