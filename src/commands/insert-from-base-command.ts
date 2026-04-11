import { Editor, Notice, Plugin, TFile } from "obsidian";

import { COMMAND_IDS, COMMAND_NAMES, NOTICES } from "../constants";
import { findBaseBlockUnderCursor } from "../parsing/base-block-parser";
import { buildNewItemPlanFromBaseBlock } from "../services/new-item-planner";
import { createNewItemFromPlan } from "../services/new-item-creator";

/**
 * Registers the command that creates a new item from the base block under cursor.
 */
export function registerInsertFromBaseCommand(plugin: Plugin): void {
	plugin.addCommand({
		id: COMMAND_IDS.INSERT_NEW_ITEM_FROM_BASE_UNDER_CURSOR,
		name: COMMAND_NAMES.INSERT_NEW_ITEM_FROM_BASE_UNDER_CURSOR,
		editorCallback: async (editor: Editor) => {
			await handleInsertFromBase(plugin, editor);
		},
	});
}

/**
 * Command handler: parse base block under cursor, build new note plan, create file.
 * Keeps focus in current note (does not open created file).
 */
async function handleInsertFromBase(
	plugin: Plugin,
	editor: Editor,
): Promise<void> {
	const activeFile = plugin.app.workspace.getActiveFile();

	// Guard: command only works with an active markdown file.
	if (!activeFile) {
		new Notice(NOTICES.NO_ACTIVE_FILE);
		return;
	}

	if (!(activeFile instanceof TFile) || activeFile.extension !== "md") {
		new Notice(NOTICES.ACTIVE_FILE_NOT_MARKDOWN);
		return;
	}

	try {
		const noteContent = await plugin.app.vault.read(activeFile);
		const cursorLine = editor.getCursor().line;

		const baseBlock = findBaseBlockUnderCursor(noteContent, cursorLine);
		if (!baseBlock) {
			new Notice(NOTICES.NO_BASE_BLOCK_UNDER_CURSOR);
			return;
		}

		const plan = buildNewItemPlanFromBaseBlock(baseBlock);
		const createdPath = await createNewItemFromPlan(plugin.app, plan);

		new Notice(`${NOTICES.CREATED_PREFIX} ${createdPath}`);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.error(
			"Filebase Hotkeys: failed to create item from base block",
			error,
		);
		new Notice(`${NOTICES.CREATE_FAILED_PREFIX} ${message}`);
	}
}
