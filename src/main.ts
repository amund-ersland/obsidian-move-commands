import { Plugin } from "obsidian";
import { FolderCommandRegistry } from "./commands/folder-commands";
import { registerUtilityCommands } from "./commands/utility-commands";
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

	async onload(): Promise<void> {
		this.settings = normalizeSettings(await this.loadData());

		this.folderCommands = new FolderCommandRegistry(this);
		this.folderCommands.refresh();

		registerUtilityCommands(this);
		this.addSettingTab(new MoveCommandsSettingTab(this.app, this));
	}

	onunload(): void {
		this.folderCommands?.removeAll();
		this.folderCommands = null;
	}

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
