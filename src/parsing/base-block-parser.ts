import { BaseFilterValues, ParsedBaseBlock } from "../types";
import { parseScalar } from "../utils/scalars";
import { countLeadingSpaces, stripMatchingQuotes } from "../utils/strings";

/**
 * Parses a markdown document and returns the ` ```base ` block that contains
 * the provided cursor line.
 *
 * Notes:
 * - `cursorLine` is expected to be 0-based (matching Obsidian editor API).
 * - The parser intentionally supports a practical YAML-like subset used in base blocks.
 */
export function findBaseBlockUnderCursor(
	noteContent: string,
	cursorLine: number,
): ParsedBaseBlock | null {
	const lines = noteContent.split(/\r?\n/);

	let i = 0;
	while (i < lines.length) {
		const line = lines[i].trim();

		if (line !== "```base") {
			i++;
			continue;
		}

		const startLine = i;
		let endLine = -1;

		for (let j = i + 1; j < lines.length; j++) {
			if (lines[j].trim() === "```") {
				endLine = j;
				break;
			}
		}

		if (endLine === -1) {
			// Unclosed block: stop scanning.
			break;
		}

		const isCursorInside = cursorLine >= startLine && cursorLine <= endLine;
		if (isCursorInside) {
			const innerLines = lines.slice(startLine + 1, endLine);
			const parsed = parseBaseYamlLike(innerLines);

			return {
				startLine,
				endLine,
				filterValues: parsed.filterValues,
				properties: parsed.properties,
				orderKeys: parsed.orderKeys,
			};
		}

		i = endLine + 1;
	}

	return null;
}

interface ParsedYamlLikeResult {
	filterValues: BaseFilterValues;
	properties: string[];
	orderKeys: string[];
}

/**
 * Lightweight parser for base-block YAML-like content.
 *
 * Supported extraction:
 * - `filters:` section with equality expressions (`key == value`)
 * - `properties:` section keys
 * - `order:` section keys
 */
function parseBaseYamlLike(innerLines: string[]): ParsedYamlLikeResult {
	const filterValues: BaseFilterValues = {
		literalProperties: {},
	};

	const properties: string[] = [];
	const orderKeys: string[] = [];

	let inFilters = false;
	let filtersIndent = -1;

	let inProperties = false;
	let propertiesIndent = -1;

	let inOrder = false;
	let orderIndent = -1;

	for (const rawLine of innerLines) {
		const indent = countLeadingSpaces(rawLine);
		const trimmed = rawLine.trim();

		// Ignore blank/comment lines
		if (!trimmed || trimmed.startsWith("#")) {
			continue;
		}

		// Section starts
		if (trimmed === "filters:" || trimmed.startsWith("filters:")) {
			inFilters = true;
			filtersIndent = indent;
			inProperties = false;
			inOrder = false;
			continue;
		}

		if (trimmed === "properties:" || trimmed.startsWith("properties:")) {
			inProperties = true;
			propertiesIndent = indent;
			inFilters = false;
			inOrder = false;
			continue;
		}

		if (trimmed === "order:" || trimmed.startsWith("order:")) {
			inOrder = true;
			orderIndent = indent;
			inFilters = false;
			inProperties = false;
			continue;
		}

		// Section ends (indentation-based)
		if (inFilters && indent <= filtersIndent) inFilters = false;
		if (inProperties && indent <= propertiesIndent) inProperties = false;
		if (inOrder && indent <= orderIndent) inOrder = false;

		// Parse properties list / map-like declarations
		if (inProperties) {
			const listMatch = trimmed.match(/^-+\s+(.+)$/);
			if (listMatch) {
				const key = stripMatchingQuotes(listMatch[1].trim());
				pushUniqueIfUsableField(properties, key);
				continue;
			}

			const keyMatch = trimmed.match(/^([A-Za-z0-9._-]+)\s*:/);
			if (keyMatch) {
				pushUniqueIfUsableField(properties, keyMatch[1]);
				continue;
			}
		}

		// Parse order keys (primary source for frontmatter ordering)
		if (inOrder) {
			const listMatch = trimmed.match(/^-+\s+(.+)$/);
			if (listMatch) {
				const rawKey = stripMatchingQuotes(listMatch[1].trim());
				const key = normalizeOrderToken(rawKey);
				pushUniqueIfUsableField(orderKeys, key);
				continue;
			}
		}

		// Parse filters equality expressions:
		// - file.folder == "6-tasks"
		// - status == "todo"
		// - archived == false
		if (inFilters) {
			const equalityMatch = trimmed.match(
				/^(?:-\s*)?([A-Za-z0-9._-]+)\s*==\s*(.+)$/,
			);

			if (!equalityMatch) continue;

			const key = equalityMatch[1].trim();
			const valueRaw = equalityMatch[2].trim();
			const parsedValue = parseScalar(valueRaw);

			if (key === "file.folder" && typeof parsedValue === "string") {
				filterValues.folder = parsedValue;
			} else {
				filterValues.literalProperties[key] = parsedValue;
			}

			// Include non-file.* filter keys as candidate frontmatter properties.
			if (isUsableFrontmatterField(key)) {
				pushUnique(properties, key);
			}
		}
	}

	// Merge order keys into properties (without duplicates)
	for (const key of orderKeys) {
		pushUniqueIfUsableField(properties, key);
	}

	// Ensure non-file.* filter keys are represented
	for (const key of Object.keys(filterValues.literalProperties)) {
		pushUniqueIfUsableField(properties, key);
	}

	return {
		filterValues,
		properties,
		orderKeys,
	};
}

function normalizeOrderToken(value: string): string {
	// Strip optional leading + / - sort markers and extra dashes/spaces.
	// Examples:
	// - "+status" => "status"
	// - "- title" => "title"
	return value.replace(/^[+-]\s*/, "").replace(/^-+\s*/, "").trim();
}

function isUsableFrontmatterField(key: string): boolean {
	if (!key) return false;
	if (key === "file.folder") return false;
	if (key.startsWith("file.")) return false;
	return true;
}

function pushUnique(target: string[], value: string): void {
	if (!target.includes(value)) {
		target.push(value);
	}
}

function pushUniqueIfUsableField(target: string[], key: string): void {
	if (!isUsableFrontmatterField(key)) return;
	pushUnique(target, key);
}
