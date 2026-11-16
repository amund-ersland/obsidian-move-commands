import { Notice } from "obsidian";
import type { App } from "obsidian";

/**
 * Folder icons from the Iconize plugin (`obsidian-icon-folder`).
 *
 * Only folder icons are used: the icon Iconize shows on the folder in the
 * file explorer. Iconize has no public "icon for this path" API, so this
 * reads its stored data the same way Iconize does: an icon set directly on
 * the folder wins, else the first matching custom rule that applies to
 * folders (`for` is "folders" or "everything"). Rules for files are ignored.
 *
 * Only Unicode icons (emoji) are used. A folder whose icon is an icon-pack
 * name like `LiFolder` needs SVG rendering, so it gets no icon and its label
 * is shown as configured.
 *
 * Off unless the user turns on "Use icons from Iconize", so Iconize is not
 * required.
 *
 * This file is shared by the Move Commands and Date Partitioning plugins.
 * Keep the two copies the same.
 */

const ICONIZE_ID = "obsidian-icon-folder";

/** The parts of Iconize's plugin instance this file relies on. */
interface IconizeRule {
	rule: string;
	icon: string;
	order?: number;
	useFilePath?: boolean;
	for?: string;
}

interface IconizeInstance {
	manifest?: { version?: string };
	getData?: () => unknown;
	getSettings?: () => unknown;
}

type AppWithPlugins = App & {
	plugins?: {
		enabledPlugins?: Set<string>;
		plugins?: Record<string, unknown>;
	};
};

/** One or more emoji at the start of a label, and the space after them. */
const LEADING_EMOJI = new RegExp(
	"^(?:[\\p{Extended_Pictographic}\\p{Regional_Indicator}][\\uFE0F\\u200D\\p{Emoji_Modifier}\\p{Extended_Pictographic}]*\\s*)+",
	"u",
);

const PICTOGRAPHIC = new RegExp("[\\p{Extended_Pictographic}\\p{Regional_Indicator}]", "u");

/** True when an Iconize icon is a Unicode emoji, not an icon-pack name. */
export function isUnicodeIcon(icon: string): boolean {
	return PICTOGRAPHIC.test(icon);
}

/** `label` without the emoji it may already start with. */
export function stripLeadingEmoji(label: string): string {
	return label.replace(LEADING_EMOJI, "");
}

/** Reading Iconize failed in a way an Iconize update would explain. */
class IconizeFormatError extends Error {}

/** The setting is on, but Iconize is not installed or not enabled. */
class IconizeMissingError extends Error {}

export class IconizeIcons {
	/** Shared by every instance, so each problem is reported once per session. */
	private static readonly reported = new Set<string>();

	constructor(
		private readonly app: App,
		private readonly pluginName: string,
		private readonly isEnabled: () => boolean,
	) {}

	/**
	 * The folder icon of the first of `paths` that has an icon, or `null`.
	 * Also `null` when that icon is not Unicode: a later path's emoji is not
	 * used instead, since it belongs to another folder. Returns `null`
	 * without a message when the setting is off.
	 */
	iconFor(paths: readonly string[]): string | null {
		if (!this.isEnabled()) {
			return null;
		}

		try {
			const lookup = this.readIconize();

			if (!lookup) {
				return null;
			}

			for (const path of paths) {
				const icon = lookup(path);

				if (icon) {
					return isUnicodeIcon(icon) ? icon : null;
				}
			}
		} catch (error) {
			this.report(error);
		}

		return null;
	}

	/**
	 * `label` with Iconize's icon in front, replacing any emoji the label
	 * already starts with. Unchanged when Iconize has no Unicode icon.
	 */
	decorate(label: string, paths: readonly string[]): string {
		const icon = this.iconFor(paths);
		return icon ? `${icon} ${stripLeadingEmoji(label)}` : label;
	}

	/**
	 * A function from path to Iconize icon name, or `null` while plugins are
	 * still loading. Throws `IconizeMissingError` when Iconize is not enabled,
	 * and `IconizeFormatError` when its data no longer has the expected shape.
	 */
	private readIconize(): ((path: string) => string | null) | null {
		// Plugins are still loading; an icon will be looked up again later.
		if (!this.app.workspace.layoutReady) {
			return null;
		}

		const plugins = (this.app as AppWithPlugins).plugins;

		if (!plugins?.enabledPlugins || !plugins.plugins) {
			throw new IconizeFormatError(
				"Obsidian's plugin registry (app.plugins) has changed",
			);
		}

		if (!plugins.enabledPlugins.has(ICONIZE_ID)) {
			throw new IconizeMissingError("Iconize is not installed or not enabled");
		}

		const iconize = plugins.plugins[ICONIZE_ID] as IconizeInstance | undefined;

		if (!iconize) {
			throw new IconizeFormatError("Iconize is enabled but not loaded");
		}

		if (typeof iconize.getData !== "function") {
			throw new IconizeFormatError(
				`Iconize ${iconize.manifest?.version ?? "(unknown version)"} has no getData()`,
			);
		}

		const data = iconize.getData();

		if (!isRecord(data)) {
			throw new IconizeFormatError("Iconize getData() is not an object");
		}

		const settings =
			typeof iconize.getSettings === "function"
				? iconize.getSettings()
				: data.settings;

		if (!isRecord(settings) || !Array.isArray(settings.rules)) {
			throw new IconizeFormatError("Iconize settings have no rules list");
		}

		const rules = settings.rules
			.filter(isRule)
			.filter((rule) => (rule.for ?? "everything") !== "files")
			.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

		return (path) => {
			if (path === "settings" || path === "migrated") {
				return null;
			}

			const value = data[path];

			if (typeof value === "string") {
				return value;
			}

			if (isRecord(value) && typeof value.iconName === "string") {
				return value.iconName;
			}

			const rule = rules.find((candidate) => ruleMatches(candidate, path));
			return rule ? rule.icon : null;
		};
	}

	/** Logs and shows a notice once per session for each distinct problem. */
	private report(error: unknown): void {
		const reason = error instanceof Error ? error.message : String(error);
		const missing = error instanceof IconizeMissingError;
		const hint = missing
			? `"Use icons from Iconize" is on, but ${reason}. Install and enable Iconize, or turn the setting off.`
			: `could not read folder icons from Iconize (${reason}). An Iconize or Obsidian update may have changed its data format.`;

		if (IconizeIcons.reported.has(hint)) {
			return;
		}

		IconizeIcons.reported.add(hint);
		console.error(`${this.pluginName}: ${hint} Labels are shown as configured.`);
		new Notice(
			missing
				? `${this.pluginName}: ${hint}`
				: `${this.pluginName}: could not read folder icons from Iconize. An update may have changed its data format. See the developer console.`,
			10000,
		);
	}
}

/** Same matching as Iconize: a regex, or a plain substring if not a valid regex. */
function ruleMatches(rule: IconizeRule, path: string): boolean {
	const target = rule.useFilePath ? path : path.split("/").pop() ?? path;

	try {
		return new RegExp(rule.rule).test(target);
	} catch {
		return target.includes(rule.rule);
	}
}

function isRule(value: unknown): value is IconizeRule {
	return (
		isRecord(value) &&
		typeof value.rule === "string" &&
		typeof value.icon === "string"
	);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}
