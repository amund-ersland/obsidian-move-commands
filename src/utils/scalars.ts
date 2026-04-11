/**
 * Utilities for parsing scalar values from base filter expressions
 * and serializing scalar values into safe YAML frontmatter values.
 */

export type ScalarValue = string | number | boolean | null;

/**
 * Removes a single pair of matching surrounding quotes, if present.
 *
 * Examples:
 * - `"hello"` -> `hello`
 * - `'hello'` -> `hello`
 * - `hello` -> `hello`
 */
export function stripQuotes(input: string): string {
	const trimmed = input.trim();

	const isDoubleQuoted =
		trimmed.startsWith(`"`) && trimmed.endsWith(`"`) && trimmed.length >= 2;
	const isSingleQuoted =
		trimmed.startsWith(`'`) && trimmed.endsWith(`'`) && trimmed.length >= 2;

	if (isDoubleQuoted || isSingleQuoted) {
		return trimmed.slice(1, -1);
	}

	return trimmed;
}

/**
 * Parses a scalar token into a primitive value.
 *
 * Parsing rules:
 * - "null" (case-insensitive) => null
 * - "true"/"false" (case-insensitive) => boolean
 * - integer/float numbers => number
 * - everything else => string (with outer quotes removed)
 */
export function parseScalar(input: string): ScalarValue {
	const stripped = stripQuotes(input);

	if (/^null$/i.test(stripped)) {
		return null;
	}

	if (/^(true|false)$/i.test(stripped)) {
		return stripped.toLowerCase() === "true";
	}

	if (/^-?\d+(\.\d+)?$/.test(stripped)) {
		const n = Number(stripped);
		if (!Number.isNaN(n)) return n;
	}

	return stripped;
}

/**
 * Converts a scalar value to a YAML-safe scalar string.
 *
 * - null -> null
 * - number/boolean -> raw value
 * - string -> JSON-quoted string (safe + simple for YAML frontmatter)
 */
export function stringifyYamlScalar(value: ScalarValue): string {
	if (value === null) return "null";
	if (typeof value === "number" || typeof value === "boolean") {
		return String(value);
	}

	// JSON-style quoted strings are valid in YAML and avoid many edge cases.
	return JSON.stringify(value);
}
