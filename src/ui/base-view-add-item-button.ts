import { MarkdownView, Notice, Plugin, TFile, WorkspaceLeaf } from "obsidian";
import { NOTICES } from "../constants";
import { findBaseBlockByRenderedIndex } from "../parsing/base-block-parser";
import { buildNewItemPlanFromBaseBlock } from "../services/new-item-planner";
import { createNewItemFromPlan } from "../services/new-item-creator";

const ACTION_CLASS = "filebase-hotkeys-bases-add-item-action";
const ACTION_BOUND_ATTR = "data-filebase-bases-action-bound";
const EMBED_BOUND_ATTR = "data-filebase-bases-embed-bound";
const BASE_EMBED_SELECTOR =
	".block-language-base.bases-embed.interactive-child";
const TOOLBAR_NEW_SELECTOR = ".bases-toolbar-item.bases-toolbar-new-item-menu";

interface PostProcessorContextLike {
	sourcePath?: string;
}

export class BaseViewAddItemButtonController {
	private readonly plugin: Plugin;
	private enabled = false;
	private readonly observerByLeaf = new Map<
		WorkspaceLeaf,
		MutationObserver
	>();

	constructor(plugin: Plugin) {
		this.plugin = plugin;
	}

	enable(): void {
		if (this.enabled) return;
		this.enabled = true;

		// Reading/preview rendering path
		this.plugin.registerMarkdownPostProcessor(
			(root: HTMLElement, ctx: PostProcessorContextLike) => {
				this.decorateRenderedChunk(root, ctx.sourcePath);
			},
		);

		// Live edit + dynamic re-render path
		this.plugin.registerEvent(
			this.plugin.app.workspace.on("layout-change", () => {
				this.attachObserversForMarkdownLeaves();
				this.decorateAllMarkdownLeaves();
			}),
		);

		this.plugin.registerEvent(
			this.plugin.app.workspace.on("active-leaf-change", () => {
				this.attachObserversForMarkdownLeaves();
				this.decorateAllMarkdownLeaves();
			}),
		);

		// Initial pass
		window.setTimeout(() => {
			this.attachObserversForMarkdownLeaves();
			this.decorateAllMarkdownLeaves();
		}, 0);

		this.plugin.register(() => this.disable());
	}

	disable(): void {
		this.enabled = false;

		for (const observer of this.observerByLeaf.values()) {
			observer.disconnect();
		}
		this.observerByLeaf.clear();

		document
			.querySelectorAll<HTMLElement>(`.${ACTION_CLASS}`)
			.forEach((el) => el.remove());

		document
			.querySelectorAll<HTMLElement>(`[${ACTION_BOUND_ATTR}="true"]`)
			.forEach((el) => el.removeAttribute(ACTION_BOUND_ATTR));

		document
			.querySelectorAll<HTMLElement>(`[${EMBED_BOUND_ATTR}]`)
			.forEach((el) => el.removeAttribute(EMBED_BOUND_ATTR));
	}

	private attachObserversForMarkdownLeaves(): void {
		if (!this.enabled) return;

		const leaves = this.plugin.app.workspace.getLeavesOfType("markdown");
		const activeSet = new Set(leaves);

		for (const [leaf, observer] of this.observerByLeaf.entries()) {
			if (!activeSet.has(leaf)) {
				observer.disconnect();
				this.observerByLeaf.delete(leaf);
			}
		}

		for (const leaf of leaves) {
			if (this.observerByLeaf.has(leaf)) continue;

			const view = leaf.view;
			if (!(view instanceof MarkdownView)) continue;

			const root = view.containerEl;
			const observer = new MutationObserver(() => {
				const sourcePath =
					view.file?.path ??
					this.plugin.app.workspace.getActiveFile()?.path;
				if (!sourcePath) return;
				this.decorateContainer(root, sourcePath);
			});

			observer.observe(root, { childList: true, subtree: true });
			this.observerByLeaf.set(leaf, observer);
		}
	}

	private decorateAllMarkdownLeaves(): void {
		const leaves = this.plugin.app.workspace.getLeavesOfType("markdown");

		for (const leaf of leaves) {
			const view = leaf.view;
			if (!(view instanceof MarkdownView)) continue;

			const sourcePath =
				view.file?.path ??
				this.plugin.app.workspace.getActiveFile()?.path;
			if (!sourcePath) continue;

			this.decorateContainer(view.containerEl, sourcePath);
		}
	}

	private decorateRenderedChunk(
		root: HTMLElement,
		sourcePath?: string,
	): void {
		if (!sourcePath) return;
		this.decorateContainer(root, sourcePath);
	}

	private decorateContainer(root: HTMLElement, sourcePath: string): void {
		const embeds = root.querySelectorAll<HTMLElement>(BASE_EMBED_SELECTOR);

		embeds.forEach((embed) => {
			if (embed.getAttribute(EMBED_BOUND_ATTR)) return;

			const index = this.computeRenderedBaseIndexWithinDocument(
				sourcePath,
				embed,
			);
			embed.setAttribute(EMBED_BOUND_ATTR, String(index));

			const toolbarNewItem =
				embed.querySelector<HTMLElement>(TOOLBAR_NEW_SELECTOR);
			if (!toolbarNewItem) return;

			if (toolbarNewItem.querySelector(`:scope > .${ACTION_CLASS}`))
				return;

			const action = this.createToolbarAction(sourcePath, index);
			toolbarNewItem.appendChild(action);
		});
	}

	private computeRenderedBaseIndexWithinDocument(
		sourcePath: string,
		embed: HTMLElement,
	): number {
		const allEmbeds = Array.from(
			document.querySelectorAll<HTMLElement>(BASE_EMBED_SELECTOR),
		);

		let index = 0;
		for (const current of allEmbeds) {
			const currentPath = this.resolveSourcePathForEmbed(current);
			if (currentPath !== sourcePath) continue;

			if (current === embed) return index;
			index++;
		}

		return 0;
	}

	private resolveSourcePathForEmbed(embed: HTMLElement): string | null {
		const view = embed
			.closest(".workspace-leaf")
			?.querySelector(".markdown-source-view, .markdown-reading-view");
		if (!view) {
			return this.plugin.app.workspace.getActiveFile()?.path ?? null;
		}

		const activeMarkdownView =
			this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
		if (activeMarkdownView?.containerEl.contains(embed)) {
			return (
				activeMarkdownView.file?.path ??
				this.plugin.app.workspace.getActiveFile()?.path ??
				null
			);
		}

		for (const leaf of this.plugin.app.workspace.getLeavesOfType(
			"markdown",
		)) {
			const leafView = leaf.view;
			if (!(leafView instanceof MarkdownView)) continue;
			if (leafView.containerEl.contains(embed)) {
				return leafView.file?.path ?? null;
			}
		}

		return this.plugin.app.workspace.getActiveFile()?.path ?? null;
	}

	private createToolbarAction(
		sourcePath: string,
		renderedBlockIndex: number,
	): HTMLButtonElement {
		const button = document.createElement("button");
		button.type = "button";
		button.className = `text-icon-button ${ACTION_CLASS}`;
		button.setAttribute("tabindex", "0");
		button.setAttribute(ACTION_BOUND_ATTR, "true");
		button.setAttribute("aria-label", "Add item with Filebase Hotkeys");

		const iconSpan = document.createElement("span");
		iconSpan.className = "text-button-icon";
		iconSpan.textContent = "+";

		const labelSpan = document.createElement("span");
		labelSpan.className = "text-button-label";
		labelSpan.textContent = "Add item";

		button.appendChild(iconSpan);
		button.appendChild(labelSpan);

		this.plugin.registerDomEvent(button, "click", (event: MouseEvent) => {
			event.preventDefault();
			event.stopPropagation();
			void this.handleActionClick(sourcePath, renderedBlockIndex);
		});

		this.plugin.registerDomEvent(
			button,
			"keydown",
			(event: KeyboardEvent) => {
				if (event.key !== "Enter" && event.key !== " ") return;
				event.preventDefault();
				event.stopPropagation();
				void this.handleActionClick(sourcePath, renderedBlockIndex);
			},
		);

		return button;
	}

	private async handleActionClick(
		sourcePath: string,
		renderedBlockIndex: number,
	): Promise<void> {
		const abstract =
			this.plugin.app.vault.getAbstractFileByPath(sourcePath);

		if (!(abstract instanceof TFile)) {
			new Notice(NOTICES.NO_ACTIVE_FILE);
			return;
		}

		if (abstract.extension !== "md") {
			new Notice(NOTICES.ACTIVE_FILE_NOT_MARKDOWN);
			return;
		}

		try {
			const noteContent = await this.plugin.app.vault.read(abstract);

			const baseBlock = findBaseBlockByRenderedIndex(
				noteContent,
				renderedBlockIndex,
			);

			if (!baseBlock) {
				new Notice(NOTICES.NO_BASE_BLOCK_UNDER_PREVIEW_HOVER);
				return;
			}

			const plan = buildNewItemPlanFromBaseBlock(baseBlock);
			const createdPath = await createNewItemFromPlan(
				this.plugin.app,
				plan,
			);
			new Notice(`${NOTICES.CREATED_PREFIX} ${createdPath}`);
		} catch (error) {
			const message =
				error instanceof Error ? error.message : String(error);
			console.error(
				"Filebase Hotkeys: failed to create item from Bases toolbar action",
				{
					error,
					sourcePath,
					renderedBlockIndex,
				},
			);
			new Notice(`${NOTICES.CREATE_FAILED_PREFIX} ${message}`);
		}
	}
}
