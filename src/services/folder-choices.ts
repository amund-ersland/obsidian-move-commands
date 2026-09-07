import { VAULT_ROOT_LABEL } from "../constants";
import type { FolderMapping, MoveCommandsSettings } from "../settings/types";
import type { FileOperation, FolderChoice } from "../types";
import { NO_FILENAME_CHANGES } from "./filename";

/**
 * Turns configured mappings into the destination choices used by commands and
 * folder pickers, so both paths agree on labels, filename rules, and whether a
 * destination moves or copies.
 */

/** The choice for a single mapping. */
export function mappingToChoice(
	mapping: FolderMapping,
	forcedOperation?: FileOperation,
): FolderChoice {
	return {
		label: mapping.displayName || mapping.folderPath,
		folderPath: mapping.folderPath,
		operation:
			forcedOperation ?? (mapping.copyInsteadOfMove ? "copy" : "move"),
		filenameOptions: {
			addTimestampPrefix: mapping.addTimestampPrefix,
			addCepochPrefix: mapping.addCepochPrefix,
			standardizeFilename: mapping.standardizeFilename,
		},
	};
}

/** The vault root, which has no mapping and never renames anything. */
export function vaultRootChoice(
	operation: FileOperation = "move",
): FolderChoice {
	return {
		label: VAULT_ROOT_LABEL,
		folderPath: "",
		operation,
		filenameOptions: NO_FILENAME_CHANGES,
	};
}

/** An ad-hoc destination typed by the user, e.g. a brand new folder. */
export function customFolderChoice(
	folderPath: string,
	operation: FileOperation = "move",
): FolderChoice {
	return {
		label: folderPath || VAULT_ROOT_LABEL,
		folderPath,
		operation,
		filenameOptions: NO_FILENAME_CHANGES,
	};
}

/**
 * Every destination offered in a folder picker.
 *
 * Mappings without a folder path are skipped: they are half-finished settings
 * rows, and treating a blank path as "vault root" would move files somewhere
 * the user never asked for.
 */
export function buildFolderChoices(
	settings: MoveCommandsSettings,
	options: { includeVaultRoot: boolean; forcedOperation?: FileOperation },
): FolderChoice[] {
	const choices = settings.folderMappings
		.filter((mapping) => mapping.folderPath !== "")
		.map((mapping) => mappingToChoice(mapping, options.forcedOperation));

	if (options.includeVaultRoot) {
		choices.unshift(vaultRootChoice(options.forcedOperation));
	}

	return choices;
}
