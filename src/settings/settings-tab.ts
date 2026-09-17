import { PluginSettingTab, Setting } from "obsidian";
import type { App } from "obsidian";
import { VAULT_ROOT_LABEL } from "../constants";
import { applyFilenameOptions } from "../services/filename";
import { createFolderMapping } from "./defaults";
import type { FolderMapping } from "./types";
import type MoveCommandsPlugin from "../main";

/** Name used to show what a mapping's filename options would produce. */
const PREVIEW_FILENAME = "My Note.md";

/**
 * Settings UI.
 *
 * Each mapping is a collapsible section: with a dozen folders configured, a
 * flat list of every field at once is unusable. Changes save immediately and
 * `saveSettings` re-registers the commands, so a renamed mapping shows its new
 * name in the palette right away.
 */
export class MoveCommandsSettingTab extends PluginSettingTab {
	private readonly plugin: MoveCommandsPlugin;

	constructor(app: App, plugin: MoveCommandsPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();
		containerEl.addClass("move-commands-settings");

		new Setting(containerEl)
			.setName("Folder mappings")
			.setDesc(
				"Each mapping adds a command you can bind under Settings → Hotkeys.",
			)
			.setHeading()
			.addButton((button) =>
				button
					.setButtonText("Add folder mapping")
					.setCta()
					.onClick(async () => {
						this.plugin.settings.folderMappings.push(
							createFolderMapping(),
						);
						await this.plugin.saveSettings();
						this.display();
					}),
			);

		if (this.plugin.settings.folderMappings.length === 0) {
			containerEl.createEl("p", {
				cls: "move-commands-empty",
				text: "No folder mappings yet. Select Add folder mapping to create one.",
			});
			return;
		}

		this.plugin.settings.folderMappings.forEach((mapping, index) => {
			this.renderMapping(mapping, index);
		});
	}

	private renderMapping(mapping: FolderMapping, index: number): void {
		const section = this.containerEl.createEl("details", {
			cls: "move-commands-mapping",
		});
		const summary = section.createEl("summary", {
			cls: "move-commands-mapping-summary",
		});
		const title = summary.createSpan({
			cls: "move-commands-mapping-title",
		});
		const subtitle = summary.createSpan({
			cls: "move-commands-mapping-path",
		});

		const preview = section.createEl("p", {
			cls: "move-commands-preview",
		});

		const refreshLabels = (): void => {
			title.setText(mapping.displayName || `Mapping ${index + 1}`);
			subtitle.setText(mapping.folderPath || VAULT_ROOT_LABEL);
			preview.setText(
				`${mapping.copyInsteadOfMove ? "Copies" : "Moves"} as: ${applyFilenameOptions(
					PREVIEW_FILENAME,
					mapping,
				)}`,
			);
		};

		refreshLabels();

		const save = async (): Promise<void> => {
			refreshLabels();
			await this.plugin.saveSettings();
		};

		new Setting(section)
			.setName("Folder path")
			.setDesc("Vault-relative path. Missing folders are created.")
			.addText((text) =>
				text
					.setPlaceholder("3-content/1-zettels")
					.setValue(mapping.folderPath)
					.onChange(async (value) => {
						mapping.folderPath = value.trim();
						await save();
					}),
			);

		new Setting(section)
			.setName("Display name")
			.setDesc("Shown in the command palette and folder pickers.")
			.addText((text) =>
				text
					.setPlaceholder("Zettels")
					.setValue(mapping.displayName)
					.onChange(async (value) => {
						mapping.displayName = value;
						await save();
					}),
			);

		new Setting(section)
			.setName("Copy instead of move")
			.setDesc("Leave the original in place and duplicate it.")
			.addToggle((toggle) =>
				toggle
					.setValue(mapping.copyInsteadOfMove)
					.onChange(async (value) => {
						mapping.copyInsteadOfMove = value;
						await save();
					}),
			);

		new Setting(section)
			.setName("Standardize filename")
			.setDesc(
				"Bring the name to <cepoch>_file-name: keeps an existing prefix, " +
					"adds a cepoch prefix if there isn't one, and turns spaces into " +
					"dashes. Everything else about the name stays as it is.",
			)
			.addToggle((toggle) =>
				toggle
					.setValue(mapping.standardizeFilename)
					.onChange(async (value) => {
						mapping.standardizeFilename = value;
						await save();
					}),
			);

		new Setting(section)
			.setName("Add timestamp prefix")
			.setDesc(
				"Prefix with the local date and time (YYYYMMDDHHmm). Takes precedence over the cepoch prefix.",
			)
			.addToggle((toggle) =>
				toggle
					.setValue(mapping.addTimestampPrefix)
					.onChange(async (value) => {
						mapping.addTimestampPrefix = value;
						await save();
					}),
			);

		new Setting(section)
			.setName("Add cepoch prefix")
			.setDesc(
				"Prefix with epoch seconds in base36, reversed — short, and distinct " +
					"for notes created close together. Forces a fresh prefix even over " +
					"one \"Standardize filename\" would otherwise keep.",
			)
			.addToggle((toggle) =>
				toggle
					.setValue(mapping.addCepochPrefix)
					.onChange(async (value) => {
						mapping.addCepochPrefix = value;
						await save();
					}),
			);

		new Setting(section)
			.setName("Remove mapping")
			.setDesc(
				"Deletes this mapping and its command. Any hotkey bound to it stops working.",
			)
			.addButton((button) =>
				button
					.setButtonText("Remove")
					.setWarning()
					.onClick(async () => {
						this.plugin.settings.folderMappings.splice(index, 1);
						await this.plugin.saveSettings();
						this.display();
					}),
			);
	}
}
