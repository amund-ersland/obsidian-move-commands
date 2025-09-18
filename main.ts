import {
	App,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
	Notice,
	Modal,
} from "obsidian";

interface QuickMoveSettings {
	folderMappings: FolderMapping[];
}

interface FolderMapping {
	id: string;
	folderPath: string;
	displayName: string;
}

const DEFAULT_SETTINGS: QuickMoveSettings = {
	folderMappings: [
		{
			id: "archive",
			folderPath: "Archive",
			displayName: "Archive",
		},
		{
			id: "inbox",
			folderPath: "Inbox",
			displayName: "Inbox",
		},
		{
			id: "projects",
			folderPath: "Projects",
			displayName: "Projects",
		},
		{
			id: "daily-notes",
			folderPath: "Daily Notes",
			displayName: "Daily Notes",
		},
		{
			id: "templates",
			folderPath: "Templates",
			displayName: "Templates",
		},
		{
			id: "resources",
			folderPath: "Resources",
			displayName: "Resources",
		},
	],
};

export default class QuickMovePlugin extends Plugin {
	settings: QuickMoveSettings;

	async onload() {
		await this.loadSettings();

		// Add settings tab
		this.addSettingTab(new QuickMoveSettingTab(this.app, this));

		// Register commands for each folder mapping
		this.registerFolderCommands();

		// Add additional utility commands
		this.addUtilityCommands();
	}

	registerFolderCommands() {
		// Clear existing commands first (for when settings change)
		this.settings.folderMappings.forEach((mapping) => {
			// Try to remove existing command (won't error if doesn't exist)
			this.app.commands.removeCommand(
				`${this.manifest.id}:move-to-${mapping.id}`,
			);
		});

		// Register commands for each folder mapping
		this.settings.folderMappings.forEach((mapping) => {
			this.addCommand({
				id: `move-to-${mapping.id}`,
				name: `Move current file to ${mapping.displayName}`,
				callback: () =>
					this.moveCurrentFileToFolder(mapping.folderPath),
			});
		});
	}

	addUtilityCommands() {
		// Command to show move menu
		this.addCommand({
			id: "show-move-menu",
			name: "Show quick move menu",
			callback: () => this.showMoveMenu(),
		});

		// Command to move to root
		this.addCommand({
			id: "move-to-root",
			name: "Move current file to vault root",
			callback: () => this.moveCurrentFileToFolder(""),
		});

		// Command to duplicate file to folder
		this.addCommand({
			id: "show-duplicate-menu",
			name: "Show duplicate to folder menu",
			callback: () => this.showDuplicateMenu(),
		});

		// Command to move to parent folder
		this.addCommand({
			id: "move-to-parent",
			name: "Move current file to parent folder",
			callback: () => this.moveToParentFolder(),
		});

		// Command to create new folder and move there
		this.addCommand({
			id: "move-to-new-folder",
			name: "Create new folder and move file there",
			callback: () => this.moveToNewFolder(),
		});
	}

	async showMoveMenu() {
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			new Notice("No active file to move");
			return;
		}

		const folders = this.settings.folderMappings.map((mapping) => ({
			name: `📁 ${mapping.displayName}`,
			path: mapping.folderPath,
		}));

		// Add vault root option
		folders.unshift({ name: "🏠 Vault Root", path: "" });

		// Show suggestion modal
		const modal = new FolderSuggestionModal(
			this.app,
			folders,
			(selectedFolder) => {
				this.moveCurrentFileToFolder(selectedFolder.path);
			},
		);
		modal.open();
	}

	async showDuplicateMenu() {
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			new Notice("No active file to duplicate");
			return;
		}

		const folders = this.settings.folderMappings.map((mapping) => ({
			name: `📁 ${mapping.displayName}`,
			path: mapping.folderPath,
		}));

		// Show suggestion modal
		const modal = new FolderSuggestionModal(
			this.app,
			folders,
			(selectedFolder) => {
				this.duplicateFileToFolder(selectedFolder.path);
			},
		);
		modal.open();
	}

	async moveToParentFolder() {
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			new Notice("No active file to move");
			return;
		}

		const currentPath = activeFile.path;
		const parentPath = currentPath.substring(
			0,
			currentPath.lastIndexOf("/"),
		);
		const grandParentPath = parentPath.substring(
			0,
			parentPath.lastIndexOf("/"),
		);

		if (grandParentPath === "") {
			this.moveCurrentFileToFolder("");
		} else {
			this.moveCurrentFileToFolder(grandParentPath);
		}
	}

	async moveToNewFolder() {
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			new Notice("No active file to move");
			return;
		}

		const modal = new TextInputModal(
			this.app,
			"Enter new folder name:",
			"",
			(folderName) => {
				if (folderName.trim()) {
					this.moveCurrentFileToFolder(folderName.trim());
				}
			},
		);
		modal.open();
	}

	async duplicateFileToFolder(targetFolder: string) {
		const activeFile = this.app.workspace.getActiveFile();

		if (!activeFile) {
			new Notice("No active file to duplicate");
			return;
		}

		if (!(activeFile instanceof TFile)) {
			new Notice("Active item is not a file");
			return;
		}

		try {
			// Ensure target folder exists
			await this.ensureFolderExists(targetFolder);

			// Read file content
			const content = await this.app.vault.read(activeFile);

			// Generate new path
			const fileName = activeFile.name;
			const baseName =
				fileName.substring(0, fileName.lastIndexOf(".")) || fileName;
			const extension =
				fileName.substring(fileName.lastIndexOf(".")) || "";

			let newPath = targetFolder
				? `${targetFolder}/${fileName}`
				: fileName;
			let counter = 1;

			// Handle name conflicts by adding numbers
			while (this.app.vault.getAbstractFileByPath(newPath)) {
				const numberedName = `${baseName} ${counter}${extension}`;
				newPath = targetFolder
					? `${targetFolder}/${numberedName}`
					: numberedName;
				counter++;
			}

			// Create the duplicate
			await this.app.vault.create(newPath, content);
			new Notice(
				`Duplicated "${activeFile.name}" to ${targetFolder || "vault root"}`,
			);
		} catch (error) {
			console.error("Error duplicating file:", error);
			new Notice(`Error duplicating file: ${error.message}`);
		}
	}

	async moveCurrentFileToFolder(targetFolder: string) {
		const activeFile = this.app.workspace.getActiveFile();

		if (!activeFile) {
			new Notice("No active file to move");
			return;
		}

		if (!(activeFile instanceof TFile)) {
			new Notice("Active item is not a file");
			return;
		}

		try {
			// Ensure target folder exists
			await this.ensureFolderExists(targetFolder);

			// Generate new path
			const newPath = targetFolder
				? `${targetFolder}/${activeFile.name}`
				: activeFile.name;

			// Check if file already exists at destination
			if (this.app.vault.getAbstractFileByPath(newPath)) {
				new Notice(`File already exists at ${newPath}`);
				return;
			}

			// Move the file
			await this.app.fileManager.renameFile(activeFile, newPath);
			new Notice(
				`Moved "${activeFile.name}" to ${targetFolder || "vault root"}`,
			);
		} catch (error) {
			console.error("Error moving file:", error);
			new Notice(`Error moving file: ${error.message}`);
		}
	}

	async ensureFolderExists(folderPath: string) {
		if (!folderPath) return; // Root folder always exists

		const folder = this.app.vault.getAbstractFileByPath(folderPath);
		if (!folder) {
			await this.app.vault.createFolder(folderPath);
		}
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData(),
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
		// Re-register commands when settings change
		this.registerFolderCommands();
	}
}

// Modal for folder selection
class FolderSuggestionModal extends Modal {
	folders: { name: string; path: string }[];
	onSelect: (folder: { name: string; path: string }) => void;

	constructor(
		app: App,
		folders: { name: string; path: string }[],
		onSelect: (folder: { name: string; path: string }) => void,
	) {
		super(app);
		this.folders = folders;
		this.onSelect = onSelect;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl("h3", { text: "Select destination folder" });

		const listEl = contentEl.createEl("div");
		listEl.style.maxHeight = "400px";
		listEl.style.overflowY = "auto";

		this.folders.forEach((folder, index) => {
			const itemEl = listEl.createEl("div");
			itemEl.style.padding = "8px";
			itemEl.style.cursor = "pointer";
			itemEl.style.borderRadius = "4px";
			itemEl.textContent = folder.name;

			itemEl.addEventListener("click", () => {
				this.onSelect(folder);
				this.close();
			});

			itemEl.addEventListener("mouseenter", () => {
				itemEl.style.backgroundColor =
					"var(--background-modifier-hover)";
			});

			itemEl.addEventListener("mouseleave", () => {
				itemEl.style.backgroundColor = "";
			});

			// Keyboard navigation
			if (index === 0) {
				itemEl.focus();
			}
		});

		// Handle keyboard navigation
		contentEl.addEventListener("keydown", (event) => {
			if (event.key === "Escape") {
				this.close();
			}
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

// Modal for text input
class TextInputModal extends Modal {
	prompt: string;
	defaultValue: string;
	onSubmit: (value: string) => void;

	constructor(
		app: App,
		prompt: string,
		defaultValue: string,
		onSubmit: (value: string) => void,
	) {
		super(app);
		this.prompt = prompt;
		this.defaultValue = defaultValue;
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl("h3", { text: this.prompt });

		const inputEl = contentEl.createEl("input");
		inputEl.type = "text";
		inputEl.value = this.defaultValue;
		inputEl.style.width = "100%";
		inputEl.style.padding = "8px";
		inputEl.style.marginBottom = "16px";

		const buttonContainer = contentEl.createEl("div");
		buttonContainer.style.display = "flex";
		buttonContainer.style.justifyContent = "flex-end";
		buttonContainer.style.gap = "8px";

		const cancelButton = buttonContainer.createEl("button");
		cancelButton.textContent = "Cancel";
		cancelButton.onclick = () => this.close();

		const submitButton = buttonContainer.createEl("button");
		submitButton.textContent = "Create";
		submitButton.style.backgroundColor = "var(--interactive-accent)";
		submitButton.style.color = "var(--text-on-accent)";
		submitButton.onclick = () => {
			this.onSubmit(inputEl.value);
			this.close();
		};

		// Handle enter key
		inputEl.addEventListener("keydown", (event) => {
			if (event.key === "Enter") {
				this.onSubmit(inputEl.value);
				this.close();
			} else if (event.key === "Escape") {
				this.close();
			}
		});

		// Focus the input
		inputEl.focus();
		inputEl.select();
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class QuickMoveSettingTab extends PluginSettingTab {
	plugin: QuickMovePlugin;

	constructor(app: App, plugin: QuickMovePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl("h2", { text: "Quick Move Plugin Settings" });

		containerEl.createEl("p", {
			text: "Configure folders for quick file movement. Each folder will create a command that can be assigned a hotkey in Obsidian's hotkey settings.",
		});

		// Add new folder mapping button
		new Setting(containerEl)
			.setName("Add new folder mapping")
			.addButton((button) => {
				button.setButtonText("Add Folder").onClick(() => {
					this.plugin.settings.folderMappings.push({
						id: `folder-${Date.now()}`,
						folderPath: "",
						displayName: "",
					});
					this.plugin.saveSettings();
					this.display();
				});
			});

		// Display existing folder mappings
		this.plugin.settings.folderMappings.forEach((mapping, index) => {
			const settingEl = new Setting(containerEl)
				.setName(`Folder Mapping ${index + 1}`)
				.setClass("quick-move-folder-setting");

			// Folder path input
			settingEl.addText((text) => {
				text.setPlaceholder("Folder path (e.g., Archive)")
					.setValue(mapping.folderPath)
					.onChange(async (value) => {
						mapping.folderPath = value;
						await this.plugin.saveSettings();
					});
				text.inputEl.style.marginRight = "10px";
			});

			// Display name input
			settingEl.addText((text) => {
				text.setPlaceholder("Display name")
					.setValue(mapping.displayName)
					.onChange(async (value) => {
						mapping.displayName = value;
						await this.plugin.saveSettings();
					});
				text.inputEl.style.marginRight = "10px";
			});

			// Delete button
			settingEl.addButton((button) => {
				button
					.setButtonText("Delete")
					.setWarning()
					.onClick(async () => {
						this.plugin.settings.folderMappings.splice(index, 1);
						await this.plugin.saveSettings();
						this.display();
					});
			});
		});
	}
}
