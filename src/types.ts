/**
 * Shared domain types for the Filebase Hotkeys plugin.
 * These types keep parsing, command handling, and file creation code consistent.
 */

/**
 * Primitive value types allowed in generated frontmatter.
 */
export type FrontmatterValue = string | number | boolean | null;

/**
 * Values inferred from the `filters` section of a base block.
 *
 * Example:
 * - file.folder == "6-tasks"  -> folder = "6-tasks"
 * - status == "todo"          -> literalProperties.status = "todo"
 */
export interface BaseFilterValues {
	/**
	 * Destination folder for the new note, inferred from `file.folder == "..."`
	 * Empty/undefined means vault root.
	 */
	folder?: string;

	/**
	 * Non-file.* filter values that should be written as frontmatter defaults.
	 */
	literalProperties: Record<string, FrontmatterValue>;
}

/**
 * Parsed representation of the ` ```base ` block that is currently under cursor.
 */
export interface ParsedBaseBlock {
	/**
	 * Zero-based start line index of the fenced block opening line.
	 */
	startLine: number;

	/**
	 * Zero-based end line index of the fenced block closing line.
	 */
	endLine: number;

	/**
	 * Filter values extracted from `filters`.
	 */
	filterValues: BaseFilterValues;

	/**
	 * Keys extracted from an optional `properties:` section.
	 */
	properties: string[];

	/**
	 * Keys extracted from `order:` section.
	 * In this plugin, this is the primary source for generated frontmatter keys.
	 */
	orderKeys: string[];
}

/**
 * Data needed to create a new markdown item from a parsed base block.
 */
export interface NewItemPlan {
	/**
	 * Full vault-relative file path to create, e.g. "6-tasks/1712345678_some-task.md"
	 */
	targetPath: string;

	/**
	 * Markdown content to write into the file.
	 */
	content: string;
}

/**
 * Result from building final frontmatter keys in deterministic order.
 */
export interface FrontmatterBuildResult {
	/**
	 * Ordered keys that will be rendered in YAML.
	 */
	orderedKeys: string[];

	/**
	 * Final values by key (null when no explicit value is available).
	 */
	values: Record<string, FrontmatterValue>;
}
