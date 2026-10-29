import { TFolder } from "obsidian";
import type { App } from "obsidian";
import { SUBVAULT_PLACEHOLDER } from "../constants";
import { normalizeFolderPath } from "./vault-paths";

/**
 * Subvaults: the folders directly under the subvaults folder, e.g.
 * `subvaults/1-programming` and `subvaults/2-anteo`. Each holds its own full
 * folder tree, so a mapping can point into "the subvault of the active file"
 * with the `{SUBVAULT}` placeholder.
 */

/** The subvault folder that holds `filePath`, or `null` when none does. */
export function subvaultOf(
	filePath: string,
	subvaultsFolder: string,
): string | null {
	const root = normalizeFolderPath(subvaultsFolder);

	if (!root || !filePath.startsWith(`${root}/`)) {
		return null;
	}

	const name = filePath.slice(root.length + 1).split("/")[0];

	// A file lying directly in the subvaults folder is in no subvault.
	return filePath === `${root}/${name}` ? null : `${root}/${name}`;
}

/** Every subvault folder, sorted by path. */
export function listSubvaults(app: App, subvaultsFolder: string): string[] {
	const root = app.vault.getFolderByPath(normalizeFolderPath(subvaultsFolder));

	if (!root) {
		return [];
	}

	return root.children
		.filter((child): child is TFolder => child instanceof TFolder)
		.map((folder) => folder.path)
		.sort();
}

/**
 * Replaces `{SUBVAULT}` in `folderPath` with the subvault of `filePath`.
 *
 * A path without the placeholder is vault-relative and returned unchanged.
 * Throws when the placeholder is used but the file is in no subvault, since
 * there is then nowhere sensible to put it.
 */
export function resolveSubvaultPath(
	folderPath: string,
	filePath: string,
	subvaultsFolder: string,
): string {
	if (!folderPath.includes(SUBVAULT_PLACEHOLDER)) {
		return folderPath;
	}

	const subvault = subvaultOf(filePath, subvaultsFolder);

	if (!subvault) {
		throw new Error(
			`the file is not in a subvault of "${subvaultsFolder}".`,
		);
	}

	return normalizeFolderPath(folderPath.split(SUBVAULT_PLACEHOLDER).join(subvault));
}
