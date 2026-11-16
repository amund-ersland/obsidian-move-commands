import { Plugin } from "obsidian";
import { FolderCommandRegistry } from "./commands/folder-commands";
import { registerUtilityCommands } from "./commands/utility-commands";
import { SUBVAULT_PLACEHOLDER } from "./constants";
import { IconizeIcons } from "./services/iconize";
import { listSubvaults, subvaultOf } from "./services/subvaults";
import { normalizeFolderPath } from "./services/vault-paths";
import {
	createDefaultSettings,
	normalizeSettings,
} from "./settings/defaults";
import { MoveCommandsSettingTab } from "./settings/settings-tab";
import type { MoveCommandsSettings } from "./settings/types";

/**
 * Move Commands plugin entry point.
 *
 * Deliberately thin: lifecycle, settings persistence, and registration only.
 * Filename rules live in `src/services/`, commands in `src/commands/`, and the
 * settings UI and modals in `src/settings/` and `src/ui/`.
 */
export default class MoveCommandsPlugin extends Plugin {
	settings: MoveCommandsSettings = createDefaultSettings();

	private folderCommands: FolderCommandRegistry | null = null;

	private readonly icons = new IconizeIcons(
		this.app,
		"Move Commands",
		() => this.settings.useIconizeIcons,
	);

	async onload(): Promise<void> {
		this.settings = normalizeSettings(await this.loadData());

		this.folderCommands = new FolderCommandRegistry(this);
		this.folderCommands.refresh();

		registerUtilityCommands(this);
		this.addSettingTab(new MoveCommandsSettingTab(this.app, this));

		// Command names are fixed when registered. Iconize may load after this
		// plugin, so register them again once every plugin has loaded.
		this.app.workspace.onLayoutReady(() => this.folderCommands?.refresh());
	}

	onunload(): void {
		this.folderCommands?.removeAll();
		this.folderCommands = null;
	}

	/**
	 * Puts the folder's Iconize icon in front of `label`. A `{SUBVAULT}`
	 * path is looked up in the active file's subvault first, then in the
	 * others, and the first folder with an icon is used.
	 */
	decorateLabel = (label: string, folderPath: string): string => {
		const { subvaultsFolder } = this.settings;
		const activePath = this.app.workspace.getActiveFile()?.path;
		const current = activePath ? subvaultOf(activePath, subvaultsFolder) : null;
		const subvaults = listSubvaults(this.app, subvaultsFolder).sort(
			(a, b) => Number(b === current) - Number(a === current),
		);
		const paths = folderPath.includes(SUBVAULT_PLACEHOLDER)
			? subvaults.map((subvault) =>
					normalizeFolderPath(folderPath.split(SUBVAULT_PLACEHOLDER).join(subvault)),
				)
			: [normalizeFolderPath(folderPath)];

		return this.icons.decorate(label, paths);
	};

	/**
	 * Persists settings and re-syncs the per-folder commands, so an added,
	 * renamed, or deleted mapping is reflected in the command palette without
	 * a reload.
	 */
	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
		this.folderCommands?.refresh();
	}
}
