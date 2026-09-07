import type { App, TFile } from "obsidian";
import { applyFilenameOptions } from "./filename";
import {
	ensureFolderExists,
	findAvailablePath,
	joinVaultPath,
	normalizeFolderPath,
} from "./vault-paths";
import type { FileOperation, FilenameOptions } from "../types";

/**
 * The vault mutations behind every command.
 *
 * These functions do the work and throw on failure; turning that into a
 * `Notice` is the command layer's job (see `src/commands/`).
 */

export interface FileOperationResult {
	/** What was performed. */
	operation: FileOperation;

	/** The file at the destination: the moved file, or the new copy. */
	file: TFile;

	/** Vault-relative destination path. */
	path: string;

	/** True when the file was already exactly where it was asked to go. */
	unchanged: boolean;
}

/**
 * Moves `file` into `folderPath`, applying `options` to its name.
 *
 * Refuses to overwrite: an occupied destination is an error, not a silent
 * replacement. Link updates are handled by `fileManager.renameFile`.
 */
export async function moveFileToFolder(
	app: App,
	file: TFile,
	folderPath: string,
	options: FilenameOptions,
): Promise<FileOperationResult> {
	const folder = normalizeFolderPath(folderPath);
	const targetPath = joinVaultPath(
		folder,
		applyFilenameOptions(file.name, options),
	);

	if (targetPath === file.path) {
		return { operation: "move", file, path: file.path, unchanged: true };
	}

	if (app.vault.getAbstractFileByPath(targetPath)) {
		throw new Error(`A file already exists at "${targetPath}".`);
	}

	await ensureFolderExists(app, folder);
	await app.fileManager.renameFile(file, targetPath);

	return { operation: "move", file, path: targetPath, unchanged: false };
}

/**
 * Copies `file` into `folderPath`, applying `options` to its name.
 *
 * Name collisions are resolved by appending a counter, so duplicating twice
 * into the same folder yields two files rather than an error.
 */
export async function copyFileToFolder(
	app: App,
	file: TFile,
	folderPath: string,
	options: FilenameOptions,
): Promise<FileOperationResult> {
	const folder = normalizeFolderPath(folderPath);

	await ensureFolderExists(app, folder);

	const targetPath = findAvailablePath(
		app,
		folder,
		applyFilenameOptions(file.name, options),
		options.standardizeFilename ? "-" : " ",
	);

	// `vault.copy` preserves binary content, unlike a read-then-create.
	const copy = await app.vault.copy(file, targetPath);

	return {
		operation: "copy",
		file: copy,
		path: copy.path,
		unchanged: false,
	};
}
