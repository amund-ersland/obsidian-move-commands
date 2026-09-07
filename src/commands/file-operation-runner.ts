import { Notice } from "obsidian";
import type { App, TFile } from "obsidian";
import { NOTICES } from "../constants";
import {
	copyFileToFolder,
	moveFileToFolder,
} from "../services/file-operations";
import type { FolderChoice } from "../types";
import { describeError } from "../utils/errors";

/**
 * The single place where a destination choice becomes a vault change plus user
 * feedback. Every command funnels through here so notices, error handling, and
 * the "open the copy" behavior stay consistent.
 */

/** The active file, or `null` after telling the user why nothing happened. */
export function requireActiveFile(app: App): TFile | null {
	const file = app.workspace.getActiveFile();

	if (!file) {
		new Notice(NOTICES.NO_ACTIVE_FILE);
		return null;
	}

	return file;
}

/** Runs `choice` against the active file. */
export async function runFileOperation(
	app: App,
	choice: FolderChoice,
): Promise<void> {
	const file = requireActiveFile(app);

	if (!file) {
		return;
	}

	// `renameFile` mutates the TFile, so the original name is captured first.
	const originalName = file.name;

	try {
		const result =
			choice.operation === "copy"
				? await copyFileToFolder(
						app,
						file,
						choice.folderPath,
						choice.filenameOptions,
					)
				: await moveFileToFolder(
						app,
						file,
						choice.folderPath,
						choice.filenameOptions,
					);

		if (result.unchanged) {
			new Notice(`"${originalName}" is already in ${choice.label}.`);
			return;
		}

		if (result.operation === "copy") {
			await app.workspace.getLeaf("tab").openFile(result.file);
		}

		const verb = result.operation === "copy" ? "Copied" : "Moved";
		new Notice(`${verb} "${originalName}" to ${choice.label}.`);
	} catch (error) {
		console.error("Move Commands: file operation failed", error);
		new Notice(
			`Could not ${choice.operation} "${originalName}": ${describeError(error)}`,
		);
	}
}
