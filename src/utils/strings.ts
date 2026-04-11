/**
 * String utility helpers used by base-block parsing.
 */

/**
 * Counts leading spaces in a line.
 * Tabs are treated as non-space characters here (callers can normalize tabs first if needed).
 */
export function countLeadingSpaces(line: string): number {
	let count = 0;
	for (let i = 0; i < line.length; i++) {
		if (line[i] === " ") {
			count++;
		} else {
			break;
		}
	}
	return count;
}

/**
 * Removes matching single or double quotes around a string value.
 * If the value is not wrapped in matching quotes, returns it unchanged.
 */
export function stripMatchingQuotes(value: string): string {
	if (value.length < 2) return value;

	const startsWithSingle = value.startsWith("'");
	const endsWithSingle = value.endsWith("'");
	if (startsWithSingle && endsWithSingle) {
		return value.slice(1, -1);
	}

	const startsWithDouble = value.startsWith('"');
	const endsWithDouble = value.endsWith('"');
	if (startsWithDouble && endsWithDouble) {
		return value.slice(1, -1);
	}

	return value;
}

/**
 * Escapes and wraps a string as a JSON-quoted string.
 * Useful when emitting YAML-compatible quoted scalar values.
 */
export function quoteAsJsonString(value: string): string {
	return JSON.stringify(value);
}
