import { normalizeFolderPath } from "../services/vault-paths";
import type { FolderMapping, MoveCommandsSettings } from "./types";

/**
 * Settings defaults and validation.
 *
 * Persisted data is user-editable JSON that predates several of the current
 * fields, so it is normalized on load rather than trusted: missing flags
 * default to `false` and unusable entries are dropped instead of producing
 * commands that would move files somewhere unexpected.
 */

/** A fresh, empty settings object. */
export function createDefaultSettings(): MoveCommandsSettings {
	return { folderMappings: [] };
}

/** A blank mapping for the "Add folder mapping" button. */
export function createFolderMapping(): FolderMapping {
	return {
		id: `folder-${Date.now()}`,
		folderPath: "",
		displayName: "",
		addTimestampPrefix: false,
		addCepochPrefix: false,
		copyInsteadOfMove: false,
		standardizeFilename: false,
	};
}

/** Coerces whatever `loadData()` returned into a complete settings object. */
export function normalizeSettings(data: unknown): MoveCommandsSettings {
	const raw = isRecord(data) ? data : {};
	const rawMappings = Array.isArray(raw.folderMappings)
		? raw.folderMappings
		: [];

	const seenIds = new Set<string>();
	const folderMappings = rawMappings
		.filter(isRecord)
		.map((entry, index) => normalizeMapping(entry, index))
		.filter((mapping) => {
			if (seenIds.has(mapping.id)) {
				return false;
			}

			seenIds.add(mapping.id);
			return true;
		});

	return { folderMappings };
}

function normalizeMapping(
	entry: Record<string, unknown>,
	index: number,
): FolderMapping {
	const folderPath = normalizeFolderPath(asString(entry.folderPath));
	const id = asString(entry.id) || `folder-unnamed-${index}`;

	return {
		id,
		folderPath,
		displayName: asString(entry.displayName) || folderPath || id,
		addTimestampPrefix: asBoolean(entry.addTimestampPrefix),
		addCepochPrefix: asBoolean(entry.addCepochPrefix),
		copyInsteadOfMove: asBoolean(entry.copyInsteadOfMove),
		standardizeFilename: asBoolean(entry.standardizeFilename),
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string {
	return typeof value === "string" ? value : "";
}

function asBoolean(value: unknown): boolean {
	return value === true;
}
