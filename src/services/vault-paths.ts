import { normalizePath, TFile, TFolder } from "obsidian";
import type { App } from "obsidian";
import { splitExtension } from "./filename";

/**
 * Vault path helpers.
 *
 * Folder paths are kept in one canonical shape throughout the plugin: no
 * leading or trailing slash, no repeated slashes, and `""` for the vault root.
 */

/** How many `name 1`, `name 2`, … candidates to try before giving up. */
const MAX_DUPLICATE_ATTEMPTS = 100;

/** Brings a user-entered folder path into canonical form. */
export function normalizeFolderPath(folderPath: string): string {
	const trimmed = folderPath.trim();

	if (!trimmed || trimmed === "/") {
		return "";
	}

	return normalizePath(trimmed).replace(/^\/+|\/+$/g, "");
}

/** Joins a canonical folder path and a filename. */
export function joinVaultPath(folderPath: string, filename: string): string {
	const folder = normalizeFolderPath(folderPath);
	return folder ? `${folder}/${filename}` : filename;
}

/** The folder containing `path`, or `""` when it sits in the vault root. */
export function parentFolderPath(path: string): string {
	const separator = path.lastIndexOf("/");
	return separator > 0 ? path.slice(0, separator) : "";
}

/**
 * Creates `folderPath` (and any missing parents) unless it already exists.
 *
 * A concurrent create is tolerated: only a still-missing folder is an error.
 */
export async function ensureFolderExists(
	app: App,
	folderPath: string,
): Promise<void> {
	const folder = normalizeFolderPath(folderPath);

	if (!folder) {
		return;
	}

	const existing = app.vault.getAbstractFileByPath(folder);

	if (existing instanceof TFolder) {
		return;
	}

	if (existing instanceof TFile) {
		throw new Error(`"${folder}" is a file, not a folder.`);
	}

	try {
		await app.vault.createFolder(folder);
	} catch (error) {
		if (!app.vault.getFolderByPath(folder)) {
			throw error;
		}
	}
}

/**
 * First unused path for `filename` in `folderPath`.
 *
 * `separator` sits between the base name and the counter, so a standardized
 * name stays slug-shaped (`note-1.md`) while others read naturally
 * (`Note 1.md`).
 */
export function findAvailablePath(
	app: App,
	folderPath: string,
	filename: string,
	separator: string,
): string {
	const preferred = joinVaultPath(folderPath, filename);

	if (!app.vault.getAbstractFileByPath(preferred)) {
		return preferred;
	}

	const { stem, extension } = splitExtension(filename);

	for (let counter = 1; counter <= MAX_DUPLICATE_ATTEMPTS; counter++) {
		const candidate = joinVaultPath(
			folderPath,
			`${stem}${separator}${counter}${extension}`,
		);

		if (!app.vault.getAbstractFileByPath(candidate)) {
			return candidate;
		}
	}

	throw new Error(`No available filename for "${filename}" in that folder.`);
}
