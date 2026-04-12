import { Editor, MarkdownView, Notice, Plugin, TFile } from "obsidian";

import { COMMAND_IDS, COMMAND_NAMES, NOTICES } from "../constants";
import { findBaseBlockUnderCursor } from "../parsing/base-block-parser";
import { buildNewItemPlanFromBaseBlock } from "../services/new-item-planner";
import { createNewItemFromPlan } from "../services/new-item-creator";

/**
 * Registers the command that creates a new item from:
 * - the base block under cursor (source mode), or
 * - the base block under mouse hover (preview mode / fallback).
 */
export function registerInsertFromBaseCommand(plugin: Plugin): void {
	plugin.addCommand({
		id: COMMAND_IDS.INSERT_NEW_ITEM_FROM_BASE_UNDER_CURSOR,
		name: COMMAND_NAMES.INSERT_NEW_ITEM_FROM_BASE_UNDER_CURSOR,
		editorCallback: async (editor: Editor) => {
			await handleInsertFromBase(plugin, editor);
		},
		callback: async () => {
			await handleInsertFromPreviewHover(plugin);
		},
	});
}

/**
 * Source-mode handler:
 * 1) Try base block under cursor.
 * 2) If not found, fallback to preview hover line (if available).
 */
async function handleInsertFromBase(
	plugin: Plugin,
	editor: Editor,
): Promise<void> {
	const activeFile = plugin.app.workspace.getActiveFile();

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

		// Primary: cursor line in source mode.
		const cursorLine = editor.getCursor().line;
		let baseBlock = findBaseBlockUnderCursor(noteContent, cursorLine);

		// Fallback: if cursor lookup fails, try preview hover line.
		if (!baseBlock) {
			const activeView =
				plugin.app.workspace.getActiveViewOfType(MarkdownView);
			const hoverLine = activeView
				? getHoveredPreviewLine(activeView.contentEl)
				: null;

			if (hoverLine !== null) {
				baseBlock = findBaseBlockUnderCursor(noteContent, hoverLine);
			}
		}

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
			"Filebase Hotkeys: failed to create item from base block under cursor/hover",
			error,
		);
		new Notice(`${NOTICES.CREATE_FAILED_PREFIX} ${message}`);
	}
}

/**
 * Preview-mode handler:
 * resolves the hovered line in reading view and parses the base block at that line.
 */
async function handleInsertFromPreviewHover(plugin: Plugin): Promise<void> {
	const activeFile = plugin.app.workspace.getActiveFile();

	if (!activeFile) {
		new Notice(NOTICES.NO_ACTIVE_FILE);
		return;
	}

	if (!(activeFile instanceof TFile) || activeFile.extension !== "md") {
		new Notice(NOTICES.ACTIVE_FILE_NOT_MARKDOWN);
		return;
	}

	const activeView = plugin.app.workspace.getActiveViewOfType(MarkdownView);
	const hoverLine = activeView
		? getHoveredPreviewLine(activeView.contentEl)
		: null;

	if (hoverLine === null) {
		new Notice(NOTICES.NO_BASE_BLOCK_UNDER_PREVIEW_HOVER);
		return;
	}

	try {
		const noteContent = await plugin.app.vault.read(activeFile);
		const baseBlock = findBaseBlockUnderCursor(noteContent, hoverLine);

		if (!baseBlock) {
			new Notice(NOTICES.NO_BASE_BLOCK_UNDER_PREVIEW_HOVER);
			return;
		}

		const plan = buildNewItemPlanFromBaseBlock(baseBlock);
		const createdPath = await createNewItemFromPlan(plugin.app, plan);

		new Notice(`${NOTICES.CREATED_PREFIX} ${createdPath}`);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.error(
			"Filebase Hotkeys: failed to create item from hovered base block",
			error,
		);
		new Notice(`${NOTICES.CREATE_FAILED_PREFIX} ${message}`);
	}
}

/**
 * Attempts to resolve the markdown source line currently hovered in reading view.
 *
 * Strategy:
 * - Read the current document hover chain (`:hover`).
 * - Pick the deepest hovered element that is inside preview.
 * - Walk up ancestors until a `data-line` marker is found.
 * - Parse line as 0-based integer.
 */
function getHoveredPreviewLine(previewRoot: HTMLElement): number | null {
	const hovered = getDeepestHoveredElementInPreview(previewRoot);
	if (!hovered) return null;

	const withLine = hovered.closest<HTMLElement>("[data-line]");
	if (!withLine) return null;

	const rawLine = withLine.getAttribute("data-line");
	if (!rawLine) return null;

	const line = Number.parseInt(rawLine, 10);
	if (!Number.isFinite(line) || line < 0) return null;

	return line;
}

function getDeepestHoveredElementInPreview(
	previewRoot: HTMLElement,
): HTMLElement | null {
	const doc = previewRoot.ownerDocument;

	// The right-most selector item of ':hover' is the deepest hovered element.
	// Example: "html:hover > body:hover > ... > span:hover"
	const chain = safeQuerySelectorAll(doc, ":hover");
	if (!chain || chain.length === 0) return null;

	for (let i = chain.length - 1; i >= 0; i--) {
		const element = chain[i];
		if (previewRoot.contains(element)) {
			return element;
		}
	}

	// If preview root itself is hovered but not present in chain for some reason,
	// accept root as fallback anchor for ancestor lookup.
	if (previewRoot.matches(":hover")) {
		return previewRoot;
	}

	return null;
}

function safeQuerySelectorAll(
	root: Document,
	selector: string,
): HTMLElement[] | null {
	try {
		return Array.from(root.querySelectorAll<HTMLElement>(selector));
	} catch {
		return null;
	}
}
