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

/** Characters with a conventional ASCII spelling, folded before stripping marks. */
const TRANSLITERATIONS: Record<string, string> = {
	æ: "ae",
	ø: "o",
	å: "a",
	ä: "a",
	ö: "o",
	ü: "u",
	ß: "ss",
	ð: "d",
	þ: "th",
	đ: "d",
};

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
 * Reduces a base name to lowercase `a-z0-9-`.
 *
 * Returns `""` when nothing survives, which callers treat as "keep the
 * original name" rather than producing a nameless file.
 */
export function slugify(value: string): string {
	const folded = Array.from(value.toLowerCase())
		.map((character) => TRANSLITERATIONS[character] ?? character)
		.join("");

	return folded
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

/**
 * Applies a mapping's filename options.
 *
 * A newly generated prefix replaces an existing generated one; when no prefix
 * is requested, whatever the name already had is preserved. Timestamp wins
 * over cepoch when both are enabled.
 */
export function applyFilenameOptions(
	filename: string,
	options: FilenameOptions,
	now: Date = new Date(),
): string {
	const parts = parseFilename(filename);
	const base = options.standardizeFilename
		? slugify(parts.base) || parts.base
		: parts.base;

	return formatFilename({
		prefix: generatePrefix(options, now) ?? parts.prefix,
		base,
		extension: parts.extension,
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
