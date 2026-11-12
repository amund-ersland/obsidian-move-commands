import { FuzzySuggestModal } from "obsidian";
import type { App, FuzzyMatch } from "obsidian";
import { SUBVAULT_PLACEHOLDER } from "../constants";
import type { FolderChoice } from "../types";

/**
 * Fuzzy destination picker.
 *
 * Built on `FuzzySuggestModal` so keyboard navigation, filtering, and match
 * highlighting come from Obsidian itself and match the rest of the app.
 */
export class FolderSuggestModal extends FuzzySuggestModal<FolderChoice> {
	private readonly choices: FolderChoice[];
	private readonly onChoose: (choice: FolderChoice) => void;
	private readonly subvaultsFolder: string;

	constructor(
		app: App,
		choices: FolderChoice[],
		placeholder: string,
		subvaultsFolder: string,
		onChoose: (choice: FolderChoice) => void,
	) {
		super(app);
		this.choices = choices;
		this.subvaultsFolder = subvaultsFolder;
		this.onChoose = onChoose;
		this.setPlaceholder(placeholder);
		this.setInstructions([
			{ command: "↑↓", purpose: "to navigate" },
			{ command: "↵", purpose: "to select" },
			{ command: "esc", purpose: "to dismiss" },
		]);
	}

	getItems(): FolderChoice[] {
		return this.choices;
	}

	/**
	 * Includes the path so a destination can be found by either name or path.
	 * The `{SUBVAULT}` placeholder and the subvaults folder are left out: they
	 * are in almost every path, so they only add false fuzzy matches.
	 */
	getItemText(choice: FolderChoice): string {
		const label = this.withoutSubvaultParts(choice.label);
		const path = this.withoutSubvaultParts(choice.folderPath);
		return `${label || "/"} · ${path || "/"}`;
	}

	private withoutSubvaultParts(text: string): string {
		let result = text.split(SUBVAULT_PLACEHOLDER).join("");
		const folder = this.subvaultsFolder;

		if (folder && (result === folder || result.startsWith(`${folder}/`))) {
			result = result.slice(folder.length);
		}

		return result.replace(/\/{2,}/g, "/").replace(/^\/+|\/+$/g, "");
	}

	/** Marks destinations that copy, since they look the same as moves. */
	renderSuggestion(match: FuzzyMatch<FolderChoice>, el: HTMLElement): void {
		super.renderSuggestion(match, el);
		el.addClass("move-commands-suggestion");

		if (match.item.operation === "copy") {
			el.createSpan({ cls: "move-commands-suggestion-flag", text: "copy" });
		}
	}

	onChooseItem(choice: FolderChoice): void {
		this.onChoose(choice);
	}
}
