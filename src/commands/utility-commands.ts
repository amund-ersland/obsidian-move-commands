import { Notice } from "obsidian";
import { COMMAND_IDS, COMMAND_NAMES, NOTICES, VAULT_ROOT_LABEL } from "../constants";
import {
	buildFolderChoices,
	customFolderChoice,
	vaultRootChoice,
} from "../services/folder-choices";
import { parentFolderPath } from "../services/vault-paths";
import { FolderSuggestModal } from "../ui/folder-suggest-modal";
import { TextInputModal } from "../ui/text-input-modal";
import type { FileOperation } from "../types";
import {
	requireActiveFile,
	runFileOperation,
} from "./file-operation-runner";
import type MoveCommandsPlugin from "../main";

/**
 * The commands that exist regardless of how many folder mappings are
 * configured. Registered once during `onload`; Obsidian removes them on unload.
 */
export function registerUtilityCommands(plugin: MoveCommandsPlugin): void {
	plugin.addCommand({
		id: COMMAND_IDS.SHOW_MOVE_MENU,
		name: COMMAND_NAMES.SHOW_MOVE_MENU,
		callback: () => openFolderPicker(plugin, "move"),
	});

	plugin.addCommand({
		id: COMMAND_IDS.SHOW_DUPLICATE_MENU,
		name: COMMAND_NAMES.SHOW_DUPLICATE_MENU,
		callback: () => openFolderPicker(plugin, "copy"),
	});

	plugin.addCommand({
		id: COMMAND_IDS.MOVE_TO_ROOT,
		name: COMMAND_NAMES.MOVE_TO_ROOT,
		callback: () => {
			void runFileOperation(plugin.app, vaultRootChoice());
		},
	});

	plugin.addCommand({
		id: COMMAND_IDS.MOVE_TO_PARENT,
		name: COMMAND_NAMES.MOVE_TO_PARENT,
		callback: () => moveToParentFolder(plugin),
	});

	plugin.addCommand({
		id: COMMAND_IDS.MOVE_TO_NEW_FOLDER,
		name: COMMAND_NAMES.MOVE_TO_NEW_FOLDER,
		callback: () => moveToNewFolder(plugin),
	});
}

/**
 * Offers every configured destination.
 *
 * `operation` is forced for the duplicate menu; the move menu leaves it to
 * each mapping, so a mapping configured to copy still copies from here.
 */
function openFolderPicker(
	plugin: MoveCommandsPlugin,
	operation: FileOperation,
): void {
	if (!requireActiveFile(plugin.app)) {
		return;
	}

	const choices = buildFolderChoices(plugin.settings, {
		includeVaultRoot: true,
		forcedOperation: operation === "copy" ? "copy" : undefined,
	});

	if (choices.length === 0) {
		new Notice(NOTICES.NO_FOLDER_MAPPINGS);
		return;
	}

	const placeholder =
		operation === "copy"
			? "Duplicate current file to…"
			: "Move current file to…";

	new FolderSuggestModal(plugin.app, choices, placeholder, (choice) => {
		void runFileOperation(plugin.app, choice);
	}).open();
}

/** Moves the active file one folder level up. */
function moveToParentFolder(plugin: MoveCommandsPlugin): void {
	const file = requireActiveFile(plugin.app);

	if (!file) {
		return;
	}

	const currentFolder = parentFolderPath(file.path);

	if (!currentFolder) {
		new Notice(`"${file.name}" is already in the ${VAULT_ROOT_LABEL}.`);
		return;
	}

	const destination = parentFolderPath(currentFolder);
	void runFileOperation(plugin.app, customFolderChoice(destination));
}

/** Prompts for a folder name, creating it on the way. */
function moveToNewFolder(plugin: MoveCommandsPlugin): void {
	if (!requireActiveFile(plugin.app)) {
		return;
	}

	new TextInputModal(plugin.app, {
		title: "Create new folder and move file there",
		placeholder: "Folder path, e.g. 3-content/1-zettels",
		submitText: "Create and move",
		onSubmit: (folderPath) => {
			void runFileOperation(
				plugin.app,
				customFolderChoice(folderPath),
			);
		},
	}).open();
}
