import { FILE_DEFAULTS } from "../constants";
import type { NewItemPlan, ParsedBaseBlock } from "../types";
import { FrontmatterBuilder } from "./frontmatter-builder";

/**
 * Builds a deterministic creation plan for a new markdown item based on
 * a parsed `base` block under cursor.
 *
 * The plan includes:
 * - target file path (`<folder>/<epoch>_<slug>.md` or root path)
 * - markdown content (YAML frontmatter)
 *
 * This service is intentionally pure (no vault I/O), which keeps it easy to test.
 */
export function buildNewItemPlanFromBaseBlock(
	baseBlock: ParsedBaseBlock,
): NewItemPlan {
	const frontmatterBuilder = new FrontmatterBuilder();

	const frontmatter = frontmatterBuilder.build(
		baseBlock.filterValues,
		baseBlock.properties,
		baseBlock.orderKeys,
	);

	const content = frontmatterBuilder.renderMarkdown(frontmatter);

	const fileName = buildFileName(FILE_DEFAULTS.DEFAULT_SLUG);
	const folder = normalizeFolderPath(baseBlock.filterValues.folder ?? "");

	const targetPath = folder ? `${folder}/${fileName}` : fileName;

	return {
		targetPath,
		content,
	};
}

/**
 * Creates `<epoch_seconds>_<slug>.md`
 */
function buildFileName(slug: string): string {
	const epochSeconds = Math.floor(Date.now() / 1000);
	const safeSlug = sanitizeSlug(slug) || FILE_DEFAULTS.DEFAULT_SLUG;
	return `${epochSeconds}_${safeSlug}${FILE_DEFAULTS.EXTENSION}`;
}

/**
 * Normalizes a vault-relative folder path:
 * - trims whitespace
 * - converts "\" to "/"
 * - collapses repeated slashes
 * - removes leading/trailing slash
 */
function normalizeFolderPath(path: string): string {
	return path
		.trim()
		.replace(/\\/g, "/")
		.replace(/\/+/g, "/")
		.replace(/^\/+/, "")
		.replace(/\/+$/, "");
}

/**
 * Converts free text to a simple, safe filename slug.
 */
function sanitizeSlug(input: string): string {
	return input
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9_-]+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-+/, "")
		.replace(/-+$/, "");
}
