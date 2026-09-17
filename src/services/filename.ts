import { PREFIX_SEPARATOR } from "../constants";
import type { FilenameOptions, ParsedFilename } from "../types";

/**
 * Filename generation.
 *
 * Pure string work only — nothing here touches the vault, which makes the
 * naming rules easy to reason about and to exercise in isolation.
 */

/** Filename options that leave a name untouched. */
export const NO_FILENAME_CHANGES: FilenameOptions = {
	addTimestampPrefix: false,
	addCepochPrefix: false,
	standardizeFilename: false,
};

/**
 * Matches a leading `<token>_` that looks machine-generated: short, lowercase
 * alphanumeric, and containing at least one digit.
 *
 * The digit requirement is what keeps ordinary names intact — `meeting_notes`
 * keeps its "meeting", while `202601281043_note` and a reversed base36 epoch
 * are recognized as prefixes and replaced rather than stacked.
 */
const GENERATED_PREFIX_PATTERN = /^(?=.*\d)[0-9a-z]{4,16}$/;

/** Splits a filename into its stem and its extension (including the dot). */
export function splitExtension(filename: string): {
	stem: string;
	extension: string;
} {
	const lastDot = filename.lastIndexOf(".");

	// `lastDot > 0` keeps dotfiles such as `.gitignore` in one piece.
	if (lastDot <= 0) {
		return { stem: filename, extension: "" };
	}

	return {
		stem: filename.slice(0, lastDot),
		extension: filename.slice(lastDot),
	};
}

/** Splits a filename into generated prefix, base name, and extension. */
export function parseFilename(filename: string): ParsedFilename {
	const { stem, extension } = splitExtension(filename);
	const separator = stem.indexOf(PREFIX_SEPARATOR);
	const candidate = separator > 0 ? stem.slice(0, separator) : "";

	if (!GENERATED_PREFIX_PATTERN.test(candidate)) {
		return { prefix: null, base: stem, extension };
	}

	return {
		prefix: candidate,
		base: stem.slice(separator + 1),
		extension,
	};
}

/** Renders `<prefix>_<base><extension>`, omitting an absent prefix. */
export function formatFilename(parts: ParsedFilename): string {
	const prefix = parts.prefix ? `${parts.prefix}${PREFIX_SEPARATOR}` : "";
	return `${prefix}${parts.base}${parts.extension}`;
}

/** Local `YYYYMMDDHHmm`, so names sort chronologically in the file explorer. */
export function timestampPrefix(now: Date = new Date()): string {
	const pad = (value: number): string => String(value).padStart(2, "0");

	return [
		now.getFullYear(),
		pad(now.getMonth() + 1),
		pad(now.getDate()),
		pad(now.getHours()),
		pad(now.getMinutes()),
	].join("");
}

/**
 * Epoch seconds in base36, reversed: a short prefix whose leading characters
 * differ between notes created close together.
 */
export function cepochPrefix(now: Date = new Date()): string {
	return Math.floor(now.getTime() / 1000)
		.toString(36)
		.split("")
		.reverse()
		.join("");
}

/**
 * Trims a base name and collapses internal whitespace to single hyphens.
 *
 * Everything else — case, existing hyphens/underscores, accented characters —
 * is left exactly as it was; the standard only cares about spaces.
 */
export function normalizeBaseSpacing(value: string): string {
	return value.trim().replace(/\s+/g, "-");
}

/**
 * Applies a mapping's filename options.
 *
 * With `standardizeFilename` on, the name is brought to the `<cepoch>_base`
 * standard: an existing `prefix_base` shape (anything before the first `_`)
 * is kept as-is, a name with no `_` at all gets a freshly generated cepoch
 * prefix, and the base has its spaces (only) turned into hyphens. An explicit
 * timestamp or cepoch prefix always wins over one already in the name;
 * timestamp wins over cepoch when both are requested.
 *
 * With `standardizeFilename` off, the name is left untouched apart from a
 * requested prefix, using the stricter "looks machine-generated" prefix
 * detection so ordinary underscored names (`meeting_notes`) aren't mistaken
 * for already having one.
 */
export function applyFilenameOptions(
	filename: string,
	options: FilenameOptions,
	now: Date = new Date(),
): string {
	if (!options.standardizeFilename) {
		const parts = parseFilename(filename);
		return formatFilename({
			prefix: generatePrefix(options, now) ?? parts.prefix,
			base: parts.base,
			extension: parts.extension,
		});
	}

	const { stem, extension } = splitExtension(filename);
	const separator = stem.indexOf(PREFIX_SEPARATOR);
	const hasExistingPrefix = separator > 0;
	const existingPrefix = hasExistingPrefix ? stem.slice(0, separator) : null;
	const rawBase = hasExistingPrefix ? stem.slice(separator + 1) : stem;

	return formatFilename({
		prefix: generatePrefix(options, now) ?? existingPrefix ?? cepochPrefix(now),
		base: normalizeBaseSpacing(rawBase),
		extension,
	});
}

function generatePrefix(options: FilenameOptions, now: Date): string | null {
	if (options.addTimestampPrefix) {
		return timestampPrefix(now);
	}

	if (options.addCepochPrefix) {
		return cepochPrefix(now);
	}

	return null;
}
