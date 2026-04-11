import {
	BaseFilterValues,
	FrontmatterBuildResult,
	FrontmatterValue,
} from "../types";
import { stringifyYamlScalar } from "../utils/scalars";

/**
 * FrontmatterBuilder creates deterministic YAML frontmatter for new notes.
 *
 * Design goals:
 * - Stable key order (important for predictable diffs and behavior)
 * - Ignore pseudo file keys (`file.*`)
 * - Prefer explicit filter values when available
 * - Fill missing keys with `null`
 */
export class FrontmatterBuilder {
	/**
	 * Builds frontmatter data from parsed base sections.
	 *
	 * Ordering strategy:
	 * 1) `order:` keys
	 * 2) `properties:` keys not already included
	 * 3) filter-only keys not already included
	 */
	build(
		filterValues: BaseFilterValues,
		properties: string[],
		orderKeys: string[],
	): FrontmatterBuildResult {
		const orderedKeys: string[] = [];
		const values: Record<string, FrontmatterValue> = {};

		// 1) order keys
		for (const key of orderKeys) {
			this.tryAddKey(orderedKeys, key);
		}

		// 2) properties keys
		for (const key of properties) {
			this.tryAddKey(orderedKeys, key);
		}

		// 3) filter-only keys
		for (const key of Object.keys(filterValues.literalProperties)) {
			this.tryAddKey(orderedKeys, key);
		}

		// Resolve values for final keys
		for (const key of orderedKeys) {
			if (Object.prototype.hasOwnProperty.call(filterValues.literalProperties, key)) {
				values[key] = filterValues.literalProperties[key];
			} else {
				values[key] = null;
			}
		}

		// Safety fallback: always emit at least one frontmatter key
		if (orderedKeys.length === 0) {
			orderedKeys.push("title");
			values.title = null;
		}

		return { orderedKeys, values };
	}

	/**
	 * Renders YAML frontmatter markdown text from a build result.
	 */
	renderMarkdown(build: FrontmatterBuildResult): string {
		const lines: string[] = ["---"];

		for (const key of build.orderedKeys) {
			const value = build.values[key];
			lines.push(`${key}: ${stringifyYamlScalar(value)}`);
		}

		lines.push("---", "");
		return lines.join("\n");
	}

	/**
	 * Adds key only if it is valid, not pseudo file metadata, and not duplicate.
	 */
	private tryAddKey(orderedKeys: string[], rawKey: string): void {
		const key = rawKey.trim();
		if (!key) return;
		if (this.isIgnoredKey(key)) return;
		if (!orderedKeys.includes(key)) {
			orderedKeys.push(key);
		}
	}

	/**
	 * Excludes base pseudo-fields that should never be written into frontmatter.
	 */
	private isIgnoredKey(key: string): boolean {
		return key === "file.folder" || key.startsWith("file.");
	}
}
