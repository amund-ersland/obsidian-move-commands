/**
 * Quick Move Plugin for Obsidian
 *
 * This plugin allows users to quickly move files to predefined folders using hotkeys.
 * It creates multiple commands that can be assigned hotkeys in Obsidian's standard hotkey settings.
 *
 * Features:
 * - Move files to configured folders
 * - Interactive folder selection menu
 * - Duplicate files to folders
 * - Move to parent folder or vault root
 * - Create new folders and move files there
 */

import {
	App,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
	Notice,
	Modal,
} from "obsidian";

// Interface for plugin settings - defines the structure of our saved data
interface QuickMoveSettings {
	folderMappings: FolderMapping[];
}

// Interface for individual folder mappings
interface FolderMapping {
	id: string; // Unique identifier for the folder
	folderPath: string; // Path to the folder (e.g., "Archive", "Projects/Work")
	displayName: string; // Human-readable name shown in menus
	addCepochPrefix: boolean; // Whether to add cepoch prefix when moving to this folder
	copyInsteadOfMove: boolean; // Whether to copy instead of move
}

// Default settings that are loaded when the plugin is first installed
const DEFAULT_SETTINGS: QuickMoveSettings = {
	folderMappings: [
		{
			id: "archive",
			folderPath: "Archive",
			displayName: "Archive",
			addCepochPrefix: false,
			copyInsteadOfMove: false,
		},
		{
			id: "inbox",
			folderPath: "Inbox",
			displayName: "Inbox",
			addCepochPrefix: false,
			copyInsteadOfMove: false,
		},
		{
			id: "projects",
			folderPath: "Projects",
			displayName: "Projects",
			addCepochPrefix: false,
			copyInsteadOfMove: false,
		},
		{
			id: "daily-notes",
			folderPath: "Daily Notes",
			displayName: "Daily Notes",
			addCepochPrefix: false,
			copyInsteadOfMove: false,
		},
		{
			id: "templates",
			folderPath: "Templates",
			displayName: "Templates",
			addCepochPrefix: false,
			copyInsteadOfMove: false,
		},
		{
			id: "resources",
			folderPath: "Resources",
			displayName: "Resources",
			addCepochPrefix: false,
			copyInsteadOfMove: false,
		},
	],
};

/**
 * Main plugin class - this is where all the magic happens!
 * Extends Obsidian's Plugin class to get access to the app and plugin lifecycle
 */
export default class QuickMovePlugin extends Plugin {
	settings: QuickMoveSettings;

	/**
	 * Called when the plugin is enabled
	 * This is where we set up everything: load settings, create commands, etc.
	 */
	async onload() {
		// Load our saved settings (or use defaults if first time)
		await this.loadSettings();

		// Add the settings tab so users can configure folders
		this.addSettingTab(new QuickMoveSettingTab(this.app, this));

		// Create commands for each configured folder
		this.registerFolderCommands();

		// Add extra utility commands (menus, parent folder, etc.)
		this.addUtilityCommands();
	}

	/**
	 * Creates individual commands for each configured folder
	 * These show up in the Command Palette and can be assigned hotkeys
	 */
	registerFolderCommands() {
		// First, clean up any existing commands (important when settings change)
		this.settings.folderMappings.forEach((mapping) => {
			// Remove old command if it exists (won't error if it doesn't)
			this.app.commands.removeCommand(
				`${this.manifest.id}:move-to-${mapping.id}`,
			);
		});

		// Now create a command for each folder mapping
		this.settings.folderMappings.forEach((mapping) => {
			this.addCommand({
				id: `move-to-${mapping.id}`, // Unique ID for this command
				name: `Move current file to ${mapping.displayName}`, // What users see in Command Palette
				callback: () => {
					if (mapping.copyInsteadOfMove) {
						this.duplicateFileToFolder(mapping.folderPath, mapping.addCepochPrefix);
					} else {
						this.moveCurrentFileToFolder(mapping.folderPath, mapping.addCepochPrefix);
					}
				},
			});
		});
	}

	/**
	 * Creates additional utility commands that provide extra functionality
	 * These are the "power user" features that make the plugin really shine
	 */
	addUtilityCommands() {
		// Command to show an interactive menu for selecting any configured folder
		this.addCommand({
			id: "show-move-menu",
			name: "Show quick move menu",
			callback: () => this.showMoveMenu(),
		});

		// Command to move files to the vault root (top level)
		this.addCommand({
			id: "move-to-root",
			name: "Move current file to vault root",
			callback: () => this.moveCurrentFileToFolder(""), // Empty string = root
		});

		// Command to duplicate (copy) files to folders instead of moving them
		this.addCommand({
			id: "show-duplicate-menu",
			name: "Show duplicate to folder menu",
			callback: () => this.showDuplicateMenu(),
		});

		// Command to move file up one directory level (handy for organization)
		this.addCommand({
			id: "move-to-parent",
			name: "Move current file to parent folder",
			callback: () => this.moveToParentFolder(),
		});

		// Command to create a brand new folder and move the file there
		this.addCommand({
			id: "move-to-new-folder",
			name: "Create new folder and move file there",
			callback: () => this.moveToNewFolder(),
		});
	}

	/**
	 * Shows an interactive modal where users can pick from all configured folders
	 * Great when you have many folders and don't want to memorize hotkeys for all of them
	 */
	async showMoveMenu() {
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			new Notice("No active file to move");
			return;
		}

		// Build list of folders with nice emoji icons
		const folders = this.settings.folderMappings.map((mapping) => ({
			name: `📁 ${mapping.displayName}`,
			path: mapping.folderPath,
		}));

		// Add vault root as an option at the top
		folders.unshift({ name: "🏠 Vault Root", path: "" });

		// Create and show the selection modal
		const modal = new FolderSuggestionModal(
			this.app,
			folders,
			(selectedFolder) => {
				// Find the mapping for this folder to get its prefix setting
				const mapping = this.settings.folderMappings.find(
					(m) => m.folderPath === selectedFolder.path
				);
				const addPrefix = mapping?.addCepochPrefix ?? false;
				const copyInstead = mapping?.copyInsteadOfMove ?? false;
				if (copyInstead) {
					this.duplicateFileToFolder(selectedFolder.path, addPrefix);
				} else {
					this.moveCurrentFileToFolder(selectedFolder.path, addPrefix);
				}
			},
		);
		modal.open();
	}

	/**
	 * Similar to move menu, but duplicates the file instead of moving it
	 * Useful for creating copies in multiple locations
	 */
	async showDuplicateMenu() {
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			new Notice("No active file to duplicate");
			return;
		}

		// Build folder list (same as move menu)
		const folders = this.settings.folderMappings.map((mapping) => ({
			name: `📁 ${mapping.displayName}`,
			path: mapping.folderPath,
		}));

		// Show modal for duplication
		const modal = new FolderSuggestionModal(
			this.app,
			folders,
			(selectedFolder) => {
				// Find the mapping for this folder to get its prefix setting
				const mapping = this.settings.folderMappings.find(
					(m) => m.folderPath === selectedFolder.path
				);
				const addPrefix = mapping?.addCepochPrefix ?? false;
				this.duplicateFileToFolder(selectedFolder.path, addPrefix);
			},
		);
		modal.open();
	}

	/**
	 * Moves the current file up one directory level
	 * Example: "Projects/Work/file.md" becomes "Projects/file.md"
	 */
	async moveToParentFolder() {
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			new Notice("No active file to move");
			return;
		}

		// Parse the current file path to find the parent directory
		const currentPath = activeFile.path;
		const parentPath = currentPath.substring(
			0,
			currentPath.lastIndexOf("/"),
		);
		const grandParentPath = parentPath.substring(
			0,
			parentPath.lastIndexOf("/"),
		);

		// If we're already at the top level, move to root
		if (grandParentPath === "") {
			this.moveCurrentFileToFolder("");
		} else {
			this.moveCurrentFileToFolder(grandParentPath);
		}
	}

	/**
	 * Prompts user to create a new folder and moves the file there
	 * Perfect for organizing files into new categories on the fly
	 */
	async moveToNewFolder() {
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			new Notice("No active file to move");
			return;
		}

		// Show text input modal for folder name
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

	/**
	 * Creates a copy of the current file in the specified folder
	 * Handles name conflicts by adding numbers (e.g., "file 1.md", "file 2.md")
	 */
	async duplicateFileToFolder(targetFolder: string, addPrefix: boolean = false) {
		const activeFile = this.app.workspace.getActiveFile();

		// Safety checks - make sure we have a valid file to work with
		if (!activeFile) {
			new Notice("No active file to duplicate");
			return;
		}

		if (!(activeFile instanceof TFile)) {
			new Notice("Active item is not a file");
			return;
		}

		try {
			// Make sure the destination folder exists
			await this.ensureFolderExists(targetFolder);

			// Read the file's content so we can copy it
			const content = await this.app.vault.read(activeFile);

			// Process filename with prefix if enabled
			const processedFileName = this.processFilenameWithPrefix(activeFile.name, addPrefix);

			// Parse filename to handle conflicts intelligently
			const baseName =
				processedFileName.substring(0, processedFileName.lastIndexOf(".")) || processedFileName;
			const extension =
				processedFileName.substring(processedFileName.lastIndexOf(".")) || "";

			let newPath = targetFolder
				? `${targetFolder}/${processedFileName}`
				: processedFileName;
			let counter = 1;

			// If file already exists, add numbers until we find an available name
			while (this.app.vault.getAbstractFileByPath(newPath)) {
				const numberedName = `${baseName} ${counter}${extension}`;
				newPath = targetFolder
					? `${targetFolder}/${numberedName}`
					: numberedName;
				counter++;
			}

			// Create the duplicate file with the content
			const newFile = await this.app.vault.create(newPath, content);

			// Open the newly created file in a new tab
			await this.app.workspace.getLeaf('tab').openFile(newFile);

			new Notice(
				`Duplicated "${activeFile.name}" to ${targetFolder || "vault root"}`,
			);
		} catch (error) {
			console.error("Error duplicating file:", error);
			new Notice(`Error duplicating file: ${error.message}`);
		}
	}

	/**
	 * The core function - moves the current file to the specified folder
	 * This is where the actual file movement magic happens
	 */
	async moveCurrentFileToFolder(targetFolder: string, addPrefix: boolean = false) {
		const activeFile = this.app.workspace.getActiveFile();

		// Safety checks first
		if (!activeFile) {
			new Notice("No active file to move");
			return;
		}

		if (!(activeFile instanceof TFile)) {
			new Notice("Active item is not a file");
			return;
		}

		try {
			// Create the destination folder if it doesn't exist
			await this.ensureFolderExists(targetFolder);

			// Process filename with prefix if enabled
			const newFileName = this.processFilenameWithPrefix(activeFile.name, addPrefix);

			// Build the new file path
			const newPath = targetFolder
				? `${targetFolder}/${newFileName}`
				: newFileName;

			// Check for conflicts - we don't want to overwrite existing files
			if (this.app.vault.getAbstractFileByPath(newPath)) {
				new Notice(`File already exists at ${newPath}`);
				return;
			}

			// Actually move the file using Obsidian's file manager
			await this.app.fileManager.renameFile(activeFile, newPath);
			new Notice(
				`Moved "${activeFile.name}" to ${targetFolder || "vault root"}`,
			);
		} catch (error) {
			// Log error for debugging and show user-friendly message
			console.error("Error moving file:", error);
			new Notice(`Error moving file: ${error.message}`);
		}
	}

	/**
	 * Processes filename to add cepoch prefix if enabled
	 * Removes old prefix if it exists (format: <prefix>_name)
	 */
	processFilenameWithPrefix(originalName: string, addPrefix: boolean): string {
		if (!addPrefix) {
			return originalName; // Return as-is if prefix feature is disabled
		}

		// Get cepoch (base36 encoded epoch reversed)
		const cepoch = Math.floor(Date.now() / 1000).toString(36).split('').reverse().join('');

		// Parse the filename to separate name and extension
		const lastDotIndex = originalName.lastIndexOf(".");
		const extension = lastDotIndex > 0 ? originalName.substring(lastDotIndex) : "";
		const nameWithoutExt = lastDotIndex > 0 ? originalName.substring(0, lastDotIndex) : originalName;

		// Check if the name already has a prefix (format: <prefix>_name)
		const underscoreIndex = nameWithoutExt.indexOf("_");
		let baseName = nameWithoutExt;

		if (underscoreIndex > 0) {
			// Has a prefix, remove it
			baseName = nameWithoutExt.substring(underscoreIndex + 1);
		}

		// Return new filename with cepoch prefix
		return `${cepoch}_${baseName}${extension}`;
	}

	/**
	 * Utility function to create folders if they don't exist
	 * Obsidian requires folders to exist before moving files into them
	 */
	async ensureFolderExists(folderPath: string) {
		if (!folderPath) return; // Root folder always exists, no need to create

		const folder = this.app.vault.getAbstractFileByPath(folderPath);
		if (!folder) {
			// Folder doesn't exist, so create it
			await this.app.vault.createFolder(folderPath);
		}
	}

	/**
	 * Loads plugin settings from Obsidian's data storage
	 * Merges with defaults to ensure we have all required fields
	 */
	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData(),
		);
	}

	/**
	 * Saves current settings to Obsidian's data storage
	 * Also refreshes commands to reflect any setting changes
	 */
	async saveSettings() {
		await this.saveData(this.settings);
		// Re-register commands when settings change (important for new folders)
		this.registerFolderCommands();
	}
}

/**
 * Modal for interactive folder selection
 * This creates a nice popup where users can click to select folders
 */
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
		this.onSelect = onSelect; // Callback function to execute when user selects a folder
	}

	/**
	 * Called when the modal opens - this builds the UI
	 */
	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		// Add a title to the modal
		contentEl.createEl("h3", { text: "Select destination folder" });

		// Create scrollable container for folder list
		const listEl = contentEl.createEl("div");
		listEl.style.maxHeight = "400px";
		listEl.style.overflowY = "auto";

		// Create clickable items for each folder
		this.folders.forEach((folder, index) => {
			const itemEl = listEl.createEl("div");
			itemEl.style.padding = "8px";
			itemEl.style.cursor = "pointer";
			itemEl.style.borderRadius = "4px";
			itemEl.textContent = folder.name;

			// Handle click events
			itemEl.addEventListener("click", () => {
				this.onSelect(folder);
				this.close();
			});

			// Add hover effects for better UX
			itemEl.addEventListener("mouseenter", () => {
				itemEl.style.backgroundColor =
					"var(--background-modifier-hover)";
			});

			itemEl.addEventListener("mouseleave", () => {
				itemEl.style.backgroundColor = "";
			});

			// Focus first item for keyboard navigation
			if (index === 0) {
				itemEl.focus();
			}
		});

		// Handle keyboard shortcuts (Escape to close)
		contentEl.addEventListener("keydown", (event) => {
			if (event.key === "Escape") {
				this.close();
			}
		});
	}

	/**
	 * Cleanup when modal closes
	 */
	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

/**
 * Modal for text input (used for creating new folders)
 * Simple input dialog with OK/Cancel buttons
 */
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
		this.onSubmit = onSubmit; // Callback when user submits
	}

	/**
	 * Builds the input dialog UI
	 */
	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		// Add prompt text
		contentEl.createEl("h3", { text: this.prompt });

		// Create text input field
		const inputEl = contentEl.createEl("input");
		inputEl.type = "text";
		inputEl.value = this.defaultValue;
		inputEl.style.width = "100%";
		inputEl.style.padding = "8px";
		inputEl.style.marginBottom = "16px";

		// Create button container
		const buttonContainer = contentEl.createEl("div");
		buttonContainer.style.display = "flex";
		buttonContainer.style.justifyContent = "flex-end";
		buttonContainer.style.gap = "8px";

		// Cancel button
		const cancelButton = buttonContainer.createEl("button");
		cancelButton.textContent = "Cancel";
		cancelButton.onclick = () => this.close();

		// Submit button with accent styling
		const submitButton = buttonContainer.createEl("button");
		submitButton.textContent = "Create";
		submitButton.style.backgroundColor = "var(--interactive-accent)";
		submitButton.style.color = "var(--text-on-accent)";
		submitButton.onclick = () => {
			this.onSubmit(inputEl.value);
			this.close();
		};

		// Handle keyboard shortcuts
		inputEl.addEventListener("keydown", (event) => {
			if (event.key === "Enter") {
				// Enter = submit
				this.onSubmit(inputEl.value);
				this.close();
			} else if (event.key === "Escape") {
				// Escape = cancel
				this.close();
			}
		});

		// Focus and select the input for immediate typing
		inputEl.focus();
		inputEl.select();
	}

	/**
	 * Cleanup when modal closes
	 */
	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

/**
 * Settings tab that appears in Obsidian's settings panel
 * This is where users configure their folder mappings
 */
class QuickMoveSettingTab extends PluginSettingTab {
	plugin: QuickMovePlugin;

	constructor(app: App, plugin: QuickMovePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	/**
	 * Builds the settings UI - called when user opens the settings tab
	 */
	display(): void {
		const { containerEl } = this;
		containerEl.empty(); // Clear any existing content

		// Add title and description
		containerEl.createEl("h2", { text: "Quick Move Plugin Settings" });

		containerEl.createEl("p", {
			text: "Configure folders for quick file movement. Each folder will create a command that can be assigned a hotkey in Obsidian's hotkey settings.",
		});

		// Button to add new folder mappings
		new Setting(containerEl)
			.setName("Add new folder mapping")
			.addButton((button) => {
				button.setButtonText("Add Folder").onClick(() => {
					// Add new empty mapping with unique ID
					this.plugin.settings.folderMappings.push({
						id: `folder-${Date.now()}`, // Timestamp ensures uniqueness
						folderPath: "",
						displayName: "",
						addCepochPrefix: false,
						copyInsteadOfMove: false,
					});
					this.plugin.saveSettings(); // Save and refresh commands
					this.display(); // Refresh the UI
				});
			});

		// Add explanatory header for folder mappings
		if (this.plugin.settings.folderMappings.length > 0) {
			containerEl.createEl("h3", { text: "Folder Mappings" });
			const descEl = containerEl.createEl("p", { 
				text: "For each mapping: Folder Path | Display Name | Add Cepoch Prefix (toggle) | Copy Instead of Move (toggle) | Delete",
			});
			descEl.style.fontSize = "0.9em";
			descEl.style.color = "var(--text-muted)";
			descEl.style.marginBottom = "16px";
		}

		// Display all existing folder mappings
		this.plugin.settings.folderMappings.forEach((mapping, index) => {
			const settingEl = new Setting(containerEl)
				.setName(`${index + 1}`)
				.setClass("quick-move-folder-setting"); // CSS class for styling

			// Input for folder path
			settingEl.addText((text) => {
				text.setPlaceholder("Folder path (e.g., Archive)")
					.setValue(mapping.folderPath)
					.onChange(async (value) => {
						mapping.folderPath = value;
						await this.plugin.saveSettings(); // Save changes immediately
					});
				text.inputEl.style.marginRight = "10px"; // Spacing between inputs
			});

			// Input for display name (what users see in menus)
			settingEl.addText((text) => {
				text.setPlaceholder("Display name")
					.setValue(mapping.displayName)
					.onChange(async (value) => {
						mapping.displayName = value;
						await this.plugin.saveSettings();
					});
				text.inputEl.style.marginRight = "10px";
			});

			// Checkbox for cepoch prefix
			settingEl.addToggle((toggle) => {
				toggle
					.setValue(mapping.addCepochPrefix)
					.setTooltip("Add cepoch prefix when moving files")
					.onChange(async (value) => {
						mapping.addCepochPrefix = value;
						await this.plugin.saveSettings();
					});
				toggle.toggleEl.style.marginRight = "10px";
			});

			// Checkbox for copy instead of move
			settingEl.addToggle((toggle) => {
				toggle
					.setValue(mapping.copyInsteadOfMove)
					.setTooltip("Copy file instead of moving")
					.onChange(async (value) => {
						mapping.copyInsteadOfMove = value;
						await this.plugin.saveSettings();
					});
				toggle.toggleEl.style.marginRight = "10px";
			});

			// Delete button for removing this mapping
			settingEl.addButton((button) => {
				button
					.setButtonText("Delete")
					.setWarning() // Makes button red/warning style
					.onClick(async () => {
						// Remove this mapping from the array
						this.plugin.settings.folderMappings.splice(index, 1);
						await this.plugin.saveSettings();
						this.display(); // Refresh UI to show changes
					});
			});
		});
	}
}
