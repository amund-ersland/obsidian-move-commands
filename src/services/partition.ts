import { splitExtension } from "./filename";
import { PREFIX_SEPARATOR } from "../constants";

/**
 * Date partitioning: `<folder>/YYYY/MM`, dated by the filename's prefix.
 *
 * Pure string work, like `filename.ts`. The date is read from the name the
 * file will have on arrival, so a freshly generated prefix and the partition
 * always agree. Months are in local time, matching `timestampPrefix`.
 */

/** Cepochs started in 2025; older years mean the prefix isn't one. */
const MIN_YEAR = 2024;

/**
 * The date encoded in the filename's prefix, or `null` when there is none.
 *
 * Understands the prefixes this plugin generates — a reversed base36 cepoch
 * and a `YYYYMMDDHHmm` timestamp — plus plain decimal epoch seconds used by
 * older notes.
 */
export function datePrefixOf(filename: string): Date | null {
	const { stem } = splitExtension(filename);
	const separator = stem.indexOf(PREFIX_SEPARATOR);
	const prefix = separator > 0 ? stem.slice(0, separator) : stem;

	const timestamp = prefix.match(/^(\d{4})(\d\d)(\d\d)(\d\d)(\d\d)$/);
	if (timestamp) {
		const [, year, month, day, hour, minute] = timestamp.map(Number);
		return plausible(new Date(year, month - 1, day, hour, minute));
	}

	if (/^\d{9,10}$/.test(prefix)) {
		return plausible(new Date(Number(prefix) * 1000));
	}

	if (/^[0-9a-z]{6}$/.test(prefix)) {
		const seconds = parseInt(prefix.split("").reverse().join(""), 36);
		return plausible(new Date(seconds * 1000));
	}

	return null;
}

/**
 * The `YYYY/MM` subfolder for `filename`, falling back to `now` when its
 * name carries no date.
 */
export function datePartition(filename: string, now: Date = new Date()): string {
	const date = datePrefixOf(filename) ?? now;
	const month = String(date.getMonth() + 1).padStart(2, "0");
	return `${date.getFullYear()}/${month}`;
}

function plausible(date: Date): Date | null {
	const year = date.getFullYear();
	const maxYear = new Date().getFullYear() + 1;
	return year >= MIN_YEAR && year <= maxYear ? date : null;
}
